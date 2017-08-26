import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PostsService } from '../services/posts.service';
import { AuthService } from '../services/auth.service';
import { User } from '../user';

@Component({
  selector: 'app-single-test',
  templateUrl: './single-test.component.html',
  styleUrls: ['./single-test.component.css']
})
export class SingleTestComponent implements OnInit {
  currentUser: User;
  testName: string;
  suiteName: string;
  test: any;
  testObject: any[];
  history: any[];
  result: any[];
  running = false;
  preconditions: any[];
  postconditions: any[];
  stats: any;

  // tslint:disable-next-line:max-line-length
  constructor(private postsService: PostsService, private router: Router, route: ActivatedRoute, private authenticationService: AuthService) {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.testName = route.snapshot.params['test'];
    this.suiteName = route.snapshot.params['suite'];
  }

  ngOnInit() {
    this.postsService.getTest(this.currentUser._id, this.suiteName, this.testName).subscribe(test => {
      this.test = test;
      this.history = test.history;
      this.preconditions = test.preconditions;
      this.postconditions = test.postconditions;

      try {
        this.testObject = JSON.parse(test.testObject);
      } catch (err) {
        this.testObject = test.testObject;
      }
    });

    this.postsService.getTestStats(this.currentUser._id, this.suiteName, this.testName).subscribe(stats => { this.stats = stats; })
  }

  runTest() {
    this.running = true;
    let repeat = 0;

    for (let i = 0; i < this.test.runs; i++) {
      this.postsService.getTestResult(this.currentUser._id, this.suiteName, this.testName).subscribe(result => {
        this.result = result;
        this.postsService.updateTestResult(this.currentUser._id, this.suiteName, this.testName, this.result).subscribe(() => {
          repeat++;

          if (repeat == this.test.runs) {
            this.postsService.getTest(this.currentUser._id, this.suiteName, this.testName).subscribe(test => {
              this.test = test;
              this.testObject = test.testObject;
              this.history = test.history;
              this.preconditions = test.preconditions;
              this.postconditions = test.postconditions;
              this.running = false;

              // tslint:disable-next-line:max-line-length
              this.postsService.getTestStats(this.currentUser._id, this.suiteName, this.testName).subscribe(stats => { this.stats = stats; });
            });
          }
        });
      });
    }
  }

  onClickHistory(id: string) {
    this.router.navigate(['/dashboard/suites/' + this.suiteName + '/tests/' + this.testName + '/history/' + id]);
  }

  logout() {
    this.authenticationService.logout();
  }

}
