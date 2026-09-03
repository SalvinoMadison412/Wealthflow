import { PageContent, TextItem } from '../../pdf/types';

// Fabricated statement in the same row shape as the real Kotak Mahindra
// Bank statement this parser targets (names, ref numbers, and amounts are
// all made up — this file is committed, so no real statement data belongs
// here). Rows are built directly as pdf.js's own TextItem shape rather than
// as a real PDF binary: that's the actual boundary the parser reads from
// (see PdfExtractorProvider), so testing here needs no PDF-authoring
// dependency and never touches the real, gitignored sample statement.
let y = 1000;
function row(...tokens: string[]): TextItem[] {
  y -= 20;
  return tokens.map((str, i) => ({ str, x: i * 40, y, width: str.length * 6, height: 10 }));
}

export const syntheticKotakPages: PageContent[] = [
  {
    pageNumber: 1,
    items: [
      // Deliberately out of x-order to exercise groupIntoLines' sort-by-x.
      ...[...row('Opening', 'Balance', '5,000.00')].reverse(),
      ...row('1', '07', 'Mar', '2026', 'UPI/Blinkit/643209064515/PayviaRazorpay(Value Date: 07-03-2026)', '350.00', '4,650.00'),
      ...row('2', '09', 'Mar', '2026', 'UPI/RAVI KUMAR N/570897039862/Pay to BharatPe', '500.00', '4,150.00'),
      ...row('3', '15', 'Mar', '2026', 'NEFT REF123456 SALARY CREDIT ACME CORP', '20,000.00', '24,150.00'),
      ...row('4', '31', 'Mar', '2026', 'Int.Pd:1234567890:01-03-2026to31-03-2026', '12.50', '24,162.50'),
      ...row('5', '31', 'Mar', '2026', 'UPI/ICCL MUTUAL FU/611122223333/SIP Payment', '2,000.00', '22,162.50'),
      // The "no note" UPI shape: no slash-delimited ref/note fields, just
      // "UPI/<payee> UPI-<bankRef>" — distinct from the row-1/row-2 shape.
      ...row('6', '31', 'Mar', '2026', 'UPI/THANDRA ADITYA UPI-608933463107', '300.00', '21,862.50'),
    ],
  },
];

export const EXPECTED_OPENING_BALANCE = 5000.0;
export const EXPECTED_CLOSING_BALANCE = 21862.5;
export const EXPECTED_TRANSACTION_COUNT = 6;
