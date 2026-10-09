/**
 * WP-50 Phase 1 mocks (TEMPORARY, deleted with `src/styles/directions.css`).
 *
 * MOCK-ONLY COPY. These strings describe the mock pages themselves, or are wording the directions
 * propose for Phase 3. They are not UI strings of the real site, so they live here and not in
 * `src/i18n/*.json`. Any of them that a chosen direction keeps moves into the dictionaries, with
 * identical keys in both languages, in the Phase 3 change that builds it.
 */
import type { Locale } from '../../i18n/locales';

export type Direction = 'a' | 'b';
export type MockPage = 'home' | 'doc';

export const DIRECTIONS: readonly Direction[] = ['a', 'b'];

/** The vehicle-dealer document, the longest page on a phone (WP-50 audit, flow 4). */
export const MOCK_DOC_ID = 'business-types/vehicle-dealer';

/** Site-relative route of a mock page, without locale prefix or base. */
export function mockRoute(direction: Direction, page: MockPage): string {
  return page === 'home'
    ? `design-system/directions/${direction}/`
    : `design-system/directions/${direction}/vehicle-dealer/`;
}

interface MockCopy {
  description: string;
  directionName: Record<Direction, string>;
  directionSummary: Record<Direction, string>;
  noteTitle: Record<Direction, string>;
  noteBody: string;
  pages: Record<MockPage, string>;
  seeOther: Record<Direction, string>;
  allDirections: string;
  indexTitle: string;
  indexLead: string;
  /** Proposed wording (Phase 3): "Words used in this file" names the markdown, not the page. */
  wordsUsed: string;
  /** Proposed wording: one line instead of the "Read Core first" callout. */
  stoepCaption: string;
  /** B's page facts slip: the reading-time box. */
  slipRead: string;
  minutes: string;
}

export const MOCK_COPY: Record<Locale, MockCopy> = {
  en: {
    description: 'Design mock for WP-50. Not part of the guide.',
    directionName: { a: 'Mock A', b: 'Mock B' },
    directionSummary: {
      a: 'Stoep, re-set: the same paper, green and section colours, with a quieter serif, rooibos only for "In plain words", an ink focus ring and a small set of card shapes.',
      b: 'Shweshwe and ink: a white page, indigo ink and one humanist sans typeface, with the shweshwe cloth as the hero and ochre for "In plain words" and amounts.',
    },
    noteTitle: {
      a: 'Design mock: direction A (Stoep, re-set). This is not the live guide.',
      b: 'Design mock: direction B (Shweshwe and ink). This is not the live guide.',
    },
    noteBody:
      'Only the home page and the vehicle-dealer page are mocked. Section, tool and search links open the current site.',
    pages: { home: 'Home page mock', doc: 'Vehicle-dealer page mock' },
    seeOther: { a: 'The same page in direction A', b: 'The same page in direction B' },
    allDirections: 'Both directions',
    indexTitle: 'Design directions (WP-50)',
    indexLead:
      'Two directions for the design revamp, each as a home page and a document page, in English and Afrikaans. Compare them, then decide D1 to D5 in the directions document.',
    wordsUsed: 'Words used on this page',
    stoepCaption: 'Three short questions. Then you get the steps that apply to you, in order.',
    slipRead: 'Reading time',
    minutes: '{n} min',
  },
  af: {
    description: 'Ontwerpmodel vir WP-50. Nie deel van die gids nie.',
    directionName: { a: 'Model A', b: 'Model B' },
    directionSummary: {
      a: 'Stoep, herstel: dieselfde papier, groen en afdelingkleure, met ’n stiller serif, rooibos net vir "In gewone taal", ’n inkfokusring en ’n klein stel kaartvorms.',
      b: 'Shweshwe en ink: ’n wit bladsy, indigo-ink en een humanistiese sans-lettertipe, met die shweshwe-lap as die held en oker vir "In gewone taal" en bedrae.',
    },
    noteTitle: {
      a: 'Ontwerpmodel: rigting A (Stoep, herstel). Dit is nie die regte gids nie.',
      b: 'Ontwerpmodel: rigting B (Shweshwe en ink). Dit is nie die regte gids nie.',
    },
    noteBody:
      'Net die tuisblad en die voertuighandelaar-bladsy is gemodelleer. Skakels na afdelings, nutsgoed en soek maak die huidige webwerf oop.',
    pages: { home: 'Tuisbladmodel', doc: 'Voertuighandelaar-model' },
    seeOther: { a: 'Dieselfde bladsy in rigting A', b: 'Dieselfde bladsy in rigting B' },
    allDirections: 'Albei rigtings',
    indexTitle: 'Ontwerprigtings (WP-50)',
    indexLead:
      'Twee rigtings vir die ontwerphersiening, elk as ’n tuisblad en ’n dokumentbladsy, in Engels en Afrikaans.',
    wordsUsed: 'Woorde op hierdie bladsy',
    stoepCaption: 'Drie kort vrae. Dan kry jy die stappe wat vir jou geld, in volgorde.',
    slipRead: 'Leestyd',
    minutes: '{n} min.',
  },
};
