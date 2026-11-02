// Pemakaian: npm run hash -- "passwordRahasia"
// Hasilnya ditempel ke kolom password_hash di Google Spreadsheet (untuk akun manual).
// Akun yang mendaftar lewat GitHub otomatis di-hash oleh aplikasi.
import { hash } from 'bcryptjs';

const COST = 12; // harus sama dengan BCRYPT_COST di src/lib/password.ts

const password = process.argv[2];
if (!password) {
  console.error('Pemakaian: npm run hash -- "password"');
  process.exit(1);
}
if (Buffer.byteLength(password) > 72) {
  console.error('Password maksimal 72 byte (batas bcrypt).');
  process.exit(1);
}
console.log(await hash(password, COST));
