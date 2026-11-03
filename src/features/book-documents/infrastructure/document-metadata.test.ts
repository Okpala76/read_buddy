// @vitest-environment node
import { expect, it, vi } from "vitest";
import { PDFDocument, PDFName, PDFNumber } from "pdf-lib";
import JSZip from "jszip";
import { extractDocumentMetadata } from "./document-metadata";
it("extracts actual PDF page count and metadata", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  pdf.addPage();
  pdf.setTitle("Digital book");
  pdf.setAuthor("Author");
  expect(
    await extractDocumentMetadata(
      await pdf.save(),
      "application/pdf",
      "file.pdf",
    ),
  ).toEqual({ title: "Digital book", author: "Author", pageCount: 2 });
});
it("leaves missing PDF titles editable without rejecting the file", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  expect(
    await extractDocumentMetadata(
      await pdf.save(),
      "application/pdf",
      "My reading.pdf",
    ),
  ).toEqual({ title: "", author: "", pageCount: 1 });
});
it("rejects spoofed and broken files", async () => {
  await expect(
    extractDocumentMetadata(
      new TextEncoder().encode("not a pdf"),
      "application/pdf",
      "bad.pdf",
    ),
  ).rejects.toThrow("not a PDF");
  await expect(
    extractDocumentMetadata(
      new Uint8Array([80, 75]),
      "application/epub+zip",
      "bad.epub",
    ),
  ).rejects.toThrow("Could not read");
});
async function epub(title = "A book", root = "OEBPS/book.opf") {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip");
  zip.file(
    "META-INF/container.xml",
    `<container><rootfiles><rootfile full-path="${root}"/></rootfiles></container>`,
  );
  zip.file(
    root,
    `<package><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${title}</dc:title><dc:creator>Writer</dc:creator></metadata><spine><itemref idref="chapter"/></spine></package>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}
it("extracts namespaced EPUB metadata without inventing paper pages", async () => {
  expect(
    await extractDocumentMetadata(
      await epub(),
      "application/epub+zip",
      "book.epub",
    ),
  ).toEqual({ title: "A book", author: "Writer", pageCount: null });
});
it("rejects unsafe EPUB paths and entity declarations", async () => {
  await expect(
    extractDocumentMetadata(
      await epub("Title", "../outside.opf"),
      "application/epub+zip",
      "book.epub",
    ),
  ).rejects.toThrow("Invalid EPUB package path");
  await expect(
    extractDocumentMetadata(
      await epub("<!DOCTYPE injected>"),
      "application/epub+zip",
      "book.epub",
    ),
  ).rejects.toThrow("Unsupported EPUB metadata");
});

it("keeps valid details when title metadata is malformed", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  pdf.setAuthor("Writer");
  const info = pdf.context.lookup(pdf.context.trailerInfo.Info);
  if (info && "set" in info)
    (info as import("pdf-lib").PDFDict).set(
      PDFName.of("Title"),
      PDFNumber.of(123),
    );
  expect(
    await extractDocumentMetadata(
      await pdf.save(),
      "application/pdf",
      "book.pdf",
    ),
  ).toEqual({ title: "", author: "Writer", pageCount: 1 });
});
it("uses the reader parser if the metadata parser rejects a readable PDF", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  pdf.setTitle("Reader fallback");
  const bytes = await pdf.save();
  const spy = vi
    .spyOn(PDFDocument, "load")
    .mockRejectedValueOnce(new Error("Unsupported object"));
  try {
    expect(
      await extractDocumentMetadata(bytes, "application/pdf", "book.pdf"),
    ).toEqual({ title: "Reader fallback", author: "", pageCount: 1 });
  } finally {
    spy.mockRestore();
  }
});
it("reports a broken PDF without claiming it is encrypted", async () => {
  await expect(
    extractDocumentMetadata(
      new TextEncoder().encode("%PDF-1.7\ntruncated"),
      "application/pdf",
      "bad.pdf",
    ),
  ).rejects.toThrow("could not be opened");
});
