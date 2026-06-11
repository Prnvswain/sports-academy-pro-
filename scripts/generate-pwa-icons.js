import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, '..', 'client', 'public', 'icons');

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

const pngChunk = (type, data) => {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
};

const createSolidPng = (size, r, g, b) => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const row = Buffer.alloc(1 + size * 3);
  row[0] = 0;
  for (let x = 0; x < size; x += 1) {
    const offset = 1 + x * 3;
    row[offset] = r;
    row[offset + 1] = g;
    row[offset + 2] = b;
  }

  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
};

fs.mkdirSync(iconsDir, { recursive: true });
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createSolidPng(192, 29, 78, 216));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createSolidPng(512, 15, 23, 42));

console.log('PWA icons generated in public/icons');
