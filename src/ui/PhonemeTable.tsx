import { Table, Container } from "@mantine/core";

const IPA_FONT = "'Gentium Plus', 'Lucida Sans Unicode', serif";
const PLORA_FONT = "'Plora', sans-serif";

interface PhonemeRow {
  ipa: string;
  sound: string;
  example: string;
  glyph: string;
  qwerty: string;
}

const SHORT_VOWELS: PhonemeRow[] = [
  { ipa: "æ", sound: "a", example: "cat", glyph: "a", qwerty: "a" },
  { ipa: "ɛ", sound: "e", example: "bed", glyph: "e", qwerty: "e" },
  { ipa: "ɪ", sound: "i", example: "sit", glyph: "i", qwerty: "i" },
  { ipa: "ɒ", sound: "o", example: "hot", glyph: "o", qwerty: "o" },
  { ipa: "ʌ", sound: "u", example: "cup", glyph: "u", qwerty: "u" },
  { ipa: "ʊ", sound: "oo", example: "put", glyph: "q", qwerty: "q" },
];

const LONG_VOWELS: PhonemeRow[] = [
  { ipa: "iː", sound: "ee", example: "see", glyph: "E", qwerty: "E" },
  { ipa: "ɑː", sound: "ar", example: "car", glyph: "R", qwerty: "A" },
  { ipa: "ɔː", sound: "aw", example: "saw", glyph: "B", qwerty: "B" },
  { ipa: "uː", sound: "oo", example: "too", glyph: "Q", qwerty: "Q" },
  { ipa: "ɜː", sound: "er", example: "her", glyph: "M", qwerty: "M" },
];

const DIPHTHONGS: PhonemeRow[] = [
  { ipa: "eɪ", sound: "ay", example: "day", glyph: "A", qwerty: "A" },
  { ipa: "aɪ", sound: "ie", example: "my", glyph: "I", qwerty: "I" },
  { ipa: "ɔɪ", sound: "oy", example: "boy", glyph: "Y", qwerty: "Y" },
  { ipa: "əʊ", sound: "oh", example: "go", glyph: "O", qwerty: "O" },
  { ipa: "aʊ", sound: "ow", example: "now", glyph: "W", qwerty: "W" },
  { ipa: "ɪə", sound: "ear", example: "ear", glyph: "c", qwerty: "c" },
  { ipa: "eə", sound: "air", example: "air", glyph: "F", qwerty: "F" },
  { ipa: "ʊə", sound: "ure", example: "pure", glyph: "U", qwerty: "U" },
];

const STOPS: PhonemeRow[] = [
  { ipa: "p", sound: "p", example: "pen", glyph: "p", qwerty: "p" },
  { ipa: "b", sound: "b", example: "bad", glyph: "b", qwerty: "b" },
  { ipa: "t", sound: "t", example: "tea", glyph: "t", qwerty: "t" },
  { ipa: "d", sound: "d", example: "did", glyph: "d", qwerty: "d" },
  { ipa: "k", sound: "k", example: "cat", glyph: "k", qwerty: "k" },
  { ipa: "ɡ", sound: "g", example: "got", glyph: "g", qwerty: "g" },
];

const FRICATIVES: PhonemeRow[] = [
  { ipa: "f", sound: "f", example: "fat", glyph: "f", qwerty: "f" },
  { ipa: "v", sound: "v", example: "van", glyph: "v", qwerty: "v" },
  { ipa: "θ", sound: "th", example: "thin", glyph: "T", qwerty: "T" },
  { ipa: "ð", sound: "th", example: "this", glyph: "D", qwerty: "D" },
  { ipa: "s", sound: "s", example: "sit", glyph: "s", qwerty: "s" },
  { ipa: "z", sound: "z", example: "zoo", glyph: "z", qwerty: "z" },
  { ipa: "ʃ", sound: "sh", example: "ship", glyph: "S", qwerty: "S" },
  { ipa: "ʒ", sound: "zh", example: "measure", glyph: "Z", qwerty: "Z" },
  { ipa: "h", sound: "h", example: "hat", glyph: "h", qwerty: "h" },
];

const AFFRICATES: PhonemeRow[] = [
  { ipa: "tʃ", sound: "ch", example: "chin", glyph: "C", qwerty: "C" },
  { ipa: "dʒ", sound: "j", example: "joy", glyph: "j", qwerty: "j" },
];

const NASALS: PhonemeRow[] = [
  { ipa: "m", sound: "m", example: "man", glyph: "m", qwerty: "m" },
  { ipa: "n", sound: "n", example: "no", glyph: "n", qwerty: "n" },
  { ipa: "ŋ", sound: "ng", example: "sing", glyph: "N", qwerty: "N" },
];

const APPROXIMANTS: PhonemeRow[] = [
  { ipa: "l", sound: "l", example: "leg", glyph: "l", qwerty: "l" },
  { ipa: "r", sound: "r", example: "red", glyph: "r", qwerty: "r" },
  { ipa: "w", sound: "w", example: "wet", glyph: "w", qwerty: "w" },
  { ipa: "j", sound: "y", example: "yes", glyph: "y", qwerty: "y" },
];

const SCHWA: PhonemeRow[] = [
  { ipa: "ə", sound: "uh", example: "about", glyph: "@", qwerty: "@" },
];

function Section({
  title,
  rows,
  color,
}: {
  title: string;
  rows: PhonemeRow[];
  color: string;
}) {
  return (
    <>
      <Table.Tr>
        <Table.Td colSpan={5} bg={color} c="white" fw={700} ta="center" py={6}>
          {title}
        </Table.Td>
      </Table.Tr>
      {rows.map((row) => (
        <Table.Tr key={row.ipa + row.qwerty}>
          <Table.Td ff={IPA_FONT} ta="center">
            {row.ipa}
          </Table.Td>
          <Table.Td ta="center">{row.sound}</Table.Td>
          <Table.Td>{row.example}</Table.Td>
          <Table.Td
            ff={PLORA_FONT}
            ta="center"
            style={{ fontSize: "1.8rem", letterSpacing: "0.15em" }}
          >
            {row.glyph}
          </Table.Td>
          <Table.Td ta="center" fw={500}>
            {row.qwerty}
          </Table.Td>
        </Table.Tr>
      ))}
    </>
  );
}

export default function PhonemeTable() {
  return (
    <Container size="lg" py="md">
      <Table withTableBorder withColumnBorders withRowBorders striped="even">
        <Table.Thead>
          <Table.Tr>
            <Table.Th ta="center">IPA</Table.Th>
            <Table.Th ta="center">Sound</Table.Th>
            <Table.Th>Example</Table.Th>
            <Table.Th ta="center">PLORA Glyph</Table.Th>
            <Table.Th ta="center">QWERTY Key</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Section title="Short Vowels" rows={SHORT_VOWELS} color="indigo.7" />
          <Section title="Long Vowels" rows={LONG_VOWELS} color="indigo.7" />
          <Section title="Diphthongs" rows={DIPHTHONGS} color="indigo.7" />
          <Section title="Stops" rows={STOPS} color="orange.7" />
          <Section title="Fricatives" rows={FRICATIVES} color="orange.7" />
          <Section title="Affricates" rows={AFFRICATES} color="teal.7" />
          <Section title="Nasals" rows={NASALS} color="teal.7" />
          <Section title="Approximants" rows={APPROXIMANTS} color="teal.7" />
          <Section title="Schwa" rows={SCHWA} color="gray.7" />
        </Table.Tbody>
      </Table>
    </Container>
  );
}
