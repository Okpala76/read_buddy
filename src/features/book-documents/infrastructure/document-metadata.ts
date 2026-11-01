import { PDFDocument } from "pdf-lib";
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
      throw new Error("This file is not a PDF.");
    try {
      const document = await PDFDocument.load(bytes, {
        updateMetadata: false,
        throwOnInvalidObject: true,
      });
      const pageCount = document.getPageCount();
      if (pageCount < 1 || pageCount > 100000)
        throw new Error("Invalid PDF page count.");
      return {
        title: clean(document.getTitle()) || fallback,
        author: clean(document.getAuthor()),
        pageCount,
      };
    } catch {
      throw new Error("Could not read this PDF. Use a valid, unencrypted PDF.");
    }
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
