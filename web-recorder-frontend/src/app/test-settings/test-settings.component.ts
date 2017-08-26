import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PostsService } from '../services/posts.service';
import { AuthService } from '../services/auth.service';
import { User } from '../user';

@Component({
  selector: 'app-test-settings',
  templateUrl: './test-settings.component.html',
  styleUrls: ['./test-settings.component.css']
})
export class TestSettingsComponent implements OnInit {
  currentUser: User;
  testName: string;
  suiteName: string;
  oldSuiteName: string;
  oldTestName: string;
  testMessage: string;
  suiteMessage: string;
  runsMessage: string;
  suites: any[];
  test: any;

  // tslint:disable-next-line:max-line-length
  constructor(private postsService: PostsService, private router: Router, route: ActivatedRoute, private authenticationService: AuthService) {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.testName = route.snapshot.params['test'];
    this.suiteName = route.snapshot.params['suite'];
    this.oldSuiteName = this.suiteName;
    this.oldTestName = this.testName;
  }

  ngOnInit() {
    this.postsService.getSuiteNames(this.currentUser._id).subscribe(suites => {
      this.suites = suites.sort(function (a, b) {
            return a.localeCompare(b);
      });
    });

    this.postsService.getTest(this.currentUser._id, this.suiteName, this.testName).subscribe(test => { this.test = test; });
  }

  deleteTest() {
    this.postsService.deleteTest(this.currentUser._id, this.suiteName, this.testName).subscribe(() => {
      this.router.navigate(['/dashboard/suites/', this.suiteName]);
    });
  }

  onSave() {
    this.testMessage = '';
    this.suiteMessage = '';
    this.runsMessage = '';

    // tslint:disable-next-line:max-line-length
    if (this.testName !== '' && this.suiteName !== '' && this.test.runs !== '') {
      this.postsService.updateTestSettings(this.currentUser._id, this.oldSuiteName, this.oldTestName, { 'suiteName': this.suiteName, 'testName': this.testName, 'runs': this.test.runs}).subscribe(data => {
        this.router.navigate(['/dashboard/suites/' + this.suiteName + '/tests/' + this.testName]);
      }, error => {
        this.testMessage = error._body;
      });
    }

    if (this.testName === '') {
      this.testMessage = 'Test name can not be blank';
    }

    if (this.suiteName === '') {
      this.suiteMessage = 'Suite name can not be blank';
    }

    if (this.test.runs === '') {
      this.runsMessage = 'Test runs can not be blank';
    }
  }

  onCancel() {
    this.router.navigate(['/dashboard/suites/' + this.oldSuiteName + '/tests/' + this.oldTestName]);
  }

  logout() {
    this.authenticationService.logout();
  }

}
