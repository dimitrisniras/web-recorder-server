import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PostsService } from '../services/posts.service';
import { AuthService } from '../services/auth.service';
import { User } from '../user';

@Component({
  selector: 'app-tests',
  templateUrl: './tests.component.html',
  styleUrls: ['./tests.component.css']
})
export class TestsComponent implements OnInit {
  currentUser: User;
  suiteName: string;
  tests: any[];
  newTestName: string;
  newTestStartUrl: string;
  message: string;
  history: any[];
  running = false;
  stats: any;

  // tslint:disable-next-line:max-line-length
  constructor(private postsService: PostsService, private router: Router, route: ActivatedRoute, private authenticationService: AuthService) {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.suiteName = route.snapshot.params['suite'];
  }

  ngOnInit() {
    this.postsService.getTests(this.currentUser._id, this.suiteName).subscribe(tests => {
      this.tests = tests.sort(function (a, b) {
        return a.testName.localeCompare(b.testName);
      });
    });

    this.postsService.getSuiteHistory(this.currentUser._id, this.suiteName).subscribe(history => { this.history = history; });
    this.postsService.getSuiteStats(this.currentUser._id, this.suiteName).subscribe(stats => { this.stats = stats; })
  }

  onClickListener(test: string) {
    this.router.navigate(['/dashboard/suites/' + this.suiteName + '/tests', test]);
  }

  onClickHistory(id: string) {
    this.router.navigate(['/dashboard/suites/' + this.suiteName + '/history', id]);
  }

  runSuite() {
    let repeat = 0;
    this.running = true;

    for (let i = 0; i < this.tests.length; i++) {
      this.postsService.getTestResult(this.currentUser._id, this.suiteName, this.tests[i].testName).subscribe(result => {
        this.postsService.updateTestResult(this.currentUser._id, this.suiteName, this.tests[i].testName, result).subscribe(() => {
          this.postsService.getTests(this.currentUser._id, this.suiteName).subscribe(tests => {
            this.tests = tests.sort(function (a, b) {
              return a.testName.localeCompare(b.testName);
            });

            repeat++;

            if (repeat == this.tests.length) {
              this.postsService.updateSuiteHistory(this.currentUser._id, this.suiteName).subscribe(() => {
                this.postsService.getSuiteHistory(this.currentUser._id, this.suiteName).subscribe(history => {
                  this.history = history;

                  this.postsService.getSuiteStats(this.currentUser._id, this.suiteName).subscribe(stats => { this.stats = stats; });
                });
              });

              this.running = false;
            }
          });
        });
      });
    }
  }

  runTest(testName, index) {
    this.tests[index].status = 'RUNNING...';

    this.postsService.getTestResult(this.currentUser._id, this.suiteName, testName).subscribe(result => {
      this.postsService.updateTestResult(this.currentUser._id, this.suiteName, testName, result).subscribe(() => {
        this.postsService.getTests(this.currentUser._id, this.suiteName).subscribe(tests => {
          this.tests = tests.sort(function (a, b) {
            return a.testName.localeCompare(b.testName);
          });
        });
      });
    });
  }

  createNewTest() {
    if (this.newTestName !== undefined && this.newTestName !== '') {
      // tslint:disable-next-line:max-line-length
      this.postsService.createNewTest(this.currentUser._id, { 'suite_name': this.suiteName, 'test_name': this.newTestName, 'startUrl': this.newTestStartUrl }).subscribe(data => {
        this.newTestName = '';
        this.newTestStartUrl = '';
        this.message = '';
        this.postsService.getTests(this.currentUser._id, this.suiteName).subscribe(tests => {
          this.tests = tests.sort(function (a, b) {
            return a.testName.localeCompare(b.testName);
          });
        });
      }, error => {
        this.message = error._body;
      });
    } else {
      this.message = 'Test name can not be blank';
    }
  }

  duplicate(suiteName: string, testName: string) {
    this.postsService.duplicate(this.currentUser._id, suiteName, testName).subscribe(() => {
      this.postsService.getTests(this.currentUser._id, this.suiteName).subscribe(tests => {
          this.tests = tests.sort(function (a, b) {
            return a.testName.localeCompare(b.testName);
          });
      });
    });
  }

  logout() {
    this.authenticationService.logout();
  }

}
