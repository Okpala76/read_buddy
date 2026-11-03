import { PDFDocument } from "pdf-lib";
import { DocumentInspectionError } from "../domain/document-inspection-error";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
export type DocumentMetadata = {
  title: string;
  author: string;
  pageCount: number | null;
};
const clean = (value: unknown): string =>
  typeof value === "string"
    ? value
        .replace(/\p{Cc}/gu, " ")
        .trim()
        .slice(0, 500)
    : "";
interface MetadataStream {
  on(
    event: "data",
    handler: (this: MetadataStream, chunk: Uint8Array) => void,
  ): MetadataStream;
  on(event: "error", handler: (error: Error) => void): MetadataStream;
  on(event: "end", handler: () => void): MetadataStream;
  pause(): MetadataStream;
  resume(): MetadataStream;
}
async function zipText(zip: JSZip, path: string) {
  const file = zip.file(path);
  if (!file) throw new Error("EPUB is missing its metadata.");
  return new Promise<string>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    (file as unknown as { internalStream(type: "uint8array"): MetadataStream })
      .internalStream("uint8array")
      .on("data", function (chunk) {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) {
          this.pause();
          reject(new Error("EPUB metadata is too large."));
          return;
        }
        chunks.push(chunk);
      })
      .on("error", reject)
      .on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
      .resume();
  });
}
function xml(text: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(text))
    throw new Error("Unsupported EPUB metadata.");
  return new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    processEntities: false,
  }).parse(text);
}
function first(value: unknown): string {
  if (Array.isArray(value)) return first(value[0]);
  if (value && typeof value === "object")
    return first((value as Record<string, unknown>)["#text"]);
  return clean(value);
}
export async function extractDocumentMetadata(
  bytes: Uint8Array,
  contentType: string,
  fileName: string,
): Promise<DocumentMetadata> {
  const fallback =
    clean(fileName.replace(/\.(pdf|epub)$/i, "")) || "Untitled book";
  if (contentType === "application/pdf") {
    if (Buffer.from(bytes.subarray(0, 1024)).indexOf("%PDF-") < 0)
      throw new DocumentInspectionError(
        "This file is not a PDF. Choose a PDF file.",
      );
    let document: PDFDocument;
    try {
      document = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch {
      // Use the reader's parser for PDFs that pdf-lib cannot inspect.
      return readPdfWithReader(bytes);
    }
    let pageCount: number;
    try {
      pageCount = document.getPageCount();
    } catch {
      return readPdfWithReader(bytes);
    }
    if (pageCount < 1 || pageCount > 100000)
      throw new DocumentInspectionError(
        "This PDF has an unsupported page count.",
      );
    return {
      title: optionalDetail(() => document.getTitle()),
      author: optionalDetail(() => document.getAuthor()),
      pageCount,
    };
  }
  if (contentType !== "application/epub+zip")
    throw new Error("Unsupported book format.");
  try {
    const zip = await JSZip.loadAsync(bytes);
    if (Object.keys(zip.files).length > 10000)
      throw new Error("EPUB has too many entries.");
    if ((await zipText(zip, "mimetype")).trim() !== "application/epub+zip")
      throw new Error("Invalid EPUB type.");
    const container = xml(await zipText(zip, "META-INF/container.xml"));
    const roots = container?.container?.rootfiles?.rootfile;
    const root = Array.isArray(roots) ? roots[0] : roots;
    const path = root?.["@_full-path"];
    if (
      typeof path !== "string" ||
      path.startsWith("/") ||
      path.includes("..") ||
      path.includes(":") ||
      path.includes("\\")
    )
      throw new Error("Invalid EPUB package path.");
    const packageData = xml(await zipText(zip, path));
    const metadata = packageData?.package?.metadata;
    if (!metadata || !packageData?.package?.spine)
      throw new Error("EPUB package is incomplete.");
    return {
      title: first(metadata.title) || fallback,
      author: first(metadata.creator),
      pageCount: null,
    };
  } catch (cause) {
    throw new Error(
      cause instanceof Error
        ? `Could not read this EPUB: ${cause.message}`
        : "Could not read this EPUB.",
    );
  }
}

function optionalDetail(read: () => unknown): string {
  try {
    return clean(read());
  } catch {
    return "";
  }
}
async function readPdfWithReader(bytes: Uint8Array): Promise<DocumentMetadata> {
  let task:
    | ReturnType<typeof import("pdfjs-dist/legacy/build/pdf.mjs").getDocument>
    | undefined;
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    // Loading the worker module registers PDF.js's Node worker in the same process.
    await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    task = pdfjs.getDocument({
      data: new Uint8Array(bytes),
      isEvalSupported: false,
      useSystemFonts: false,
    });
    const document = await task.promise;
    if (document.numPages < 1 || document.numPages > 100000)
      throw new DocumentInspectionError(
        "This PDF has an unsupported page count.",
      );
    let title = "",
      author = "";
    try {
      const { info } = await document.getMetadata();
      const details = info as Record<string, unknown>;
      title = clean(details.Title);
      author = clean(details.Author);
    } catch {
      /* Optional metadata must not prevent adding a readable book. */
    }
    return { title, author, pageCount: document.numPages };
  } catch (cause) {
    if (cause instanceof DocumentInspectionError) throw cause;
    if (cause instanceof Error && cause.name === "PasswordException")
      throw new DocumentInspectionError(
        "This PDF requires a password. Upload an unlocked copy.",
      );
    if (cause instanceof Error && cause.name === "InvalidPDFException")
      throw new DocumentInspectionError(
        "This PDF could not be opened. It may be damaged or incomplete. Try exporting a new copy.",
      );
    console.error("PDF inspection failed", cause);
    throw new DocumentInspectionError(
      "We couldn't check this PDF. Please try again or upload a newly exported copy.",
    );
  } finally {
    await task?.destroy().catch(() => undefined);
  }
}
