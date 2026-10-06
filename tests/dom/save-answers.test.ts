/**
 * `<st-save-answers>` on a result page: with JavaScript the page offers to keep its answers
 * (review WP-31 pass 1, minor 2).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pathView, profile } from '../../src/lib/profile-store';
import { clearAll, storage } from '../../src/lib/store';
import { PATHS, viewOf } from '../../src/scripts/path-data';
import { StSaveAnswers } from '../../src/scripts/save-answers';
import { mount } from './helpers';

const ANSWERS = { entity: 'pty', businessTypes: ['beauty'], stage: 'trading' } as const;

function setUp(answers: string = JSON.stringify(ANSWERS)): StSaveAnswers {
  mount(`<st-save-answers data-profile='${answers}' data-version="${PATHS.hash}"
    data-my-path="/business-toolkit/my-path/"><button type="button">Save these answers</button></st-save-answers>`);
  const element = document.querySelector('st-save-answers');
  if (!(element instanceof StSaveAnswers)) throw new Error('st-save-answers did not upgrade');
  element.navigate = vi.fn();
  return element;
}

beforeEach(() => {
  clearAll();
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('<st-save-answers>', () => {
  it('saves the answers and their path, then opens My path', () => {
    const element = setUp();
    element.querySelector('button')!.click();
    expect(profile.get()).toEqual(ANSWERS);
    expect(pathView.get()).toEqual(viewOf(ANSWERS, PATHS.hash));
    expect(element.navigate).toHaveBeenCalledWith(
      `${window.location.origin}/business-toolkit/my-path/?saved=1`,
    );
  });

  it('sends the answers in the address when the device will not save them', () => {
    vi.spyOn(storage.available, 'get').mockReturnValue(false);
    const element = setUp();
    element.querySelector('button')!.click();
    expect(element.navigate).toHaveBeenCalledWith(
      `${window.location.origin}/business-toolkit/my-path/?entity=pty&type=beauty&stage=trading`,
    );
  });

  it('does nothing with answers that are not valid, or once disconnected', () => {
    const element = setUp('{"entity":"pty","businessTypes":[],"stage":"trading"}');
    element.querySelector('button')!.click();
    expect(profile.get()).toBeNull();
    expect(element.navigate).not.toHaveBeenCalled();
    document.body.innerHTML = '';
    const other = setUp();
    other.remove();
    other.querySelector('button')!.click();
    expect(profile.get()).toBeNull();
  });
});
