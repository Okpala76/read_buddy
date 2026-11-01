import { expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
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
it("uses the filename when optional PDF details are absent", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  expect(
    await extractDocumentMetadata(
      await pdf.save(),
      "application/pdf",
      "My reading.pdf",
    ),
  ).toEqual({ title: "My reading", author: "", pageCount: 1 });
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
