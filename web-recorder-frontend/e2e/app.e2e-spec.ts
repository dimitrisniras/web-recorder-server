import { WebRecorderWebsitePage } from './app.po';

describe('web-recorder-website App', () => {
  let page: WebRecorderWebsitePage;

  beforeEach(() => {
    page = new WebRecorderWebsitePage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
