import { browser, by, element } from 'protractor';

export class AppPage {
  navigateTo(): Promise<unknown> {
    return browser.get(browser.baseUrl) as Promise<unknown>;
  }

  getLogoText(): Promise<string> {
    return element(by.css('h1.title')).getText() as Promise<string>;
  }
}
