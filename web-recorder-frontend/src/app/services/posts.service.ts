import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { User } from '../user';

@Injectable()
export class PostsService {
  serverURL = 'http://snf-766614.vm.okeanos.grnet.gr:4000/';

  constructor(private http: Http) { }

  getUserById(_id: string) {
    return this.http.get(this.serverURL + _id, this.jwt()).map((response: Response) => response.json());
  }

  getStats(_id: string) {
    return this.http.get(this.serverURL + _id + '/stats', this.jwt()).map((response: Response) => response.json());
  }

  getSuites(_id: string) {
    return this.http.get(this.serverURL + _id + '/suites', this.jwt()).map((response: Response) => response.json());
  }

  getSuite(_id: string, suiteName: string) {
    return this.http.get(this.serverURL + _id + '/suites/' + suiteName, this.jwt()).map((response: Response) => response.json());
  }

  getSuiteNames(_id: string) {
    return this.http.get(this.serverURL + _id + '/suiteNames', this.jwt()).map((response: Response) => response.json());
  }

  getSuiteStats(_id: string, suiteName: string) {
    return this.http.get(this.serverURL + _id + '/suites/' + suiteName + '/stats', this.jwt()).map((response: Response) => response.json());
  }

  getTests(_id: string, suiteName: string) {
    // tslint:disable-next-line:max-line-length
    return this.http.get(this.serverURL + _id + '/suites/' + suiteName + '/tests', this.jwt()).map((response: Response) => response.json());
  }

  getTestNames(_id: string, suiteName: string) {
    return this.http.get(this.serverURL + _id + '/suites/' + suiteName + '/names', this.jwt()).map((response: Response) => response.json());
  }

  getTest(_id: string, suiteName: string, testName: string) {
    // tslint:disable-next-line:max-line-length
    return this.http.get(this.serverURL + _id + '/suites/' + suiteName + '/tests/' + testName, this.jwt()).map((response: Response) => response.json());
  }

  getTestStats(_id: string, suiteName: string, testName: string) {
    // tslint:disable-next-line:max-line-length
    return this.http.get(this.serverURL + _id + '/suites/' + suiteName + '/tests/' + testName + '/stats', this.jwt()).map((response: Response) => response.json());
  }

  getTestResult(_id: string, suiteName: string, testName: string) {
    // tslint:disable-next-line:max-line-length
    return this.http.get(this.serverURL + _id + '/suites/' + suiteName + '/tests/' + testName + '/result', this.jwt()).map((response: Response) => response.json());
  }

  getSuiteHistory(_id: string, suiteName: string) {
    // tslint:disable-next-line:max-line-length
    return this.http.get(this.serverURL + _id + '/suites/' + suiteName + '/history', this.jwt()).map((response: Response) => response.json());
  }

  getSuiteTestsHistory(_id: string, suiteName: string, historyID: string) {
    // tslint:disable-next-line:max-line-length
    return this.http.get(this.serverURL + _id + '/suites/' + suiteName + '/history/' + historyID, this.jwt()).map((response: Response) => response.json());
  }

  getSuiteTestHistory(_id: string, suiteName: string, historyID: string, testName: string) {
    // tslint:disable-next-line:max-line-length
    return this.http.get(this.serverURL + _id + '/suites/' + suiteName + '/history/' + historyID + '/' + testName, this.jwt()).map((response: Response) => response.json());
  }

  getTestHistory(_id: string, suiteName: string, testName: string, historyID: string) {
    // tslint:disable-next-line:max-line-length
    return this.http.get(this.serverURL + _id + '/suites/' + suiteName + '/tests/' + testName + '/history/' + historyID, this.jwt()).map((response: Response) => response.json());
  }

  createUser(user: any) {
    return this.http.post(this.serverURL + 'register', user, this.jwt());
  }

  createNewSuite(_id: string, suiteName: string) {
    return this.http.post(this.serverURL + _id + '/suites/', {'suiteName': suiteName}, this.jwt());
  }

  createNewTest(_id: string, info: any) {
    return this.http.post(this.serverURL + _id + '/test', info, this.jwt());
  }

  forgotPassword(email: string) {
    return this.http.post(this.serverURL + 'forgot-password', {'email': email});
  }

  resetPassword(tempPass: string, password: string) {
    return this.http.post(this.serverURL + 'reset-password/' + tempPass, {'password': password});
  }

  duplicate(_id: string, suiteName: string, testName: string) {
    return this.http.post(this.serverURL + _id + '/' + suiteName + '/' + testName + '/duplicate', {}, this.jwt());
  }

  updateUser(_id: string, info: any) {
    return this.http.put(this.serverURL + _id, info, this.jwt());
  }

  updateUserPassword(_id: string, info: any) {
    return this.http.put(this.serverURL + _id + '/password', info, this.jwt());
  }

  updateTest(_id: string, suiteName: string, testName: string, info: any) {
    return this.http.put(this.serverURL + _id + '/suites/' + suiteName + '/tests/' + testName + '/edit', info, this.jwt());
  }

  updateTestResult(_id: string, suiteName: string, testName: string, result: any[]) {
    // tslint:disable-next-line:max-line-length
    return this.http.put(this.serverURL + _id + '/suites/' + suiteName + '/tests/' + testName + '/update-result', result, this.jwt());
  }

  updateTestSettings(_id: string, suiteName: string, testName: string, info: any) {
    return this.http.put(this.serverURL + _id + '/suites/' + suiteName + '/tests/' + testName + '/settings', info, this.jwt());
  }

  updateSuiteSettings(_id: string, suiteName: string, info: any) {
    return this.http.put(this.serverURL + _id + '/suites/' + suiteName + '/settings', info, this.jwt());
  }

  updateSuiteHistory(_id: string, suiteName: string) {
    return this.http.put(this.serverURL + _id + '/suites/' + suiteName + '/history', {}, this.jwt());
  }

  updateStepsID(_id: string, suiteName: string, testName: string, index: number, newID: string) {
    // tslint:disable-next-line:max-line-length
    return this.http.put(this.serverURL + _id + '/suites/' + suiteName + '/tests/' + testName + '/updateid', { 'index': index, 'newID': newID }, this.jwt());
  }

  deleteTest(_id: string, suiteName: string, testName: string) {
    return this.http.put(this.serverURL + _id + '/suites/' + suiteName + '/tests/' + testName, {}, this.jwt());
  }

  deleteSuite(_id: string, suiteName: string) {
    return this.http.put(this.serverURL + _id + '/suites/' + suiteName, {}, this.jwt());
  }

  deleteSuiteHistory(_id: string, suiteName: string, historyID: string) {
    return this.http.put(this.serverURL + _id + '/suites/' + suiteName + '/history/' + historyID, {}, this.jwt());
  }

  deleteSuiteTestHistory(_id: string, suiteName: string, historyID: string, testName: string) {
    return this.http.put(this.serverURL + _id + '/suites/' + suiteName + '/history/' + historyID + '/' + testName, {}, this.jwt());
  }

  deleteTestHistory(_id: string, suiteName: string, testName: string, historyID: string) {
    // tslint:disable-next-line:max-line-length
    return this.http.put(this.serverURL + _id + '/suites/' + suiteName + '/tests/' + testName + '/history/' + historyID, {}, this.jwt());
  }

  deleteUser(_id: string) {
    return this.http.delete(this.serverURL + _id, this.jwt());
  }

  private jwt() {
    // create authorization header with jwt token
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && currentUser.token) {
      let headers = new Headers({ 'Authorization': 'Bearer ' + currentUser.token });
      return new RequestOptions({ headers: headers });
    }
  }

}
