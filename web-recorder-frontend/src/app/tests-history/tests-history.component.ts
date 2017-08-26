import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PostsService } from '../services/posts.service';
import { AuthService } from '../services/auth.service';
import { User } from '../user';

@Component({
  selector: 'app-tests-history',
  templateUrl: './tests-history.component.html',
  styleUrls: ['./tests-history.component.css']
})
export class TestsHistoryComponent implements OnInit {
  currentUser: User;
  suiteName: string;
  history: any;
  historyID: string;
  tests: any[];

  // tslint:disable-next-line:max-line-length
  constructor(private postsService: PostsService, private router: Router, route: ActivatedRoute, private authenticationService: AuthService) {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.suiteName = route.snapshot.params['suite'];
    this.historyID = route.snapshot.params['id'];
   }

  ngOnInit() {
    this.postsService.getSuiteTestsHistory(this.currentUser._id, this.suiteName, this.historyID).subscribe(history => {
      this.history = history;
      this.tests = history.tests.sort(function(a, b) {
        return a.testName.localeCompare(b.testName);
      });
    });
  }

  onClickListener(testName: string) {
    this.router.navigate(['/dashboard/suites/' + this.suiteName + '/history/' + this.historyID + '/' + testName]);
  }

  returnToSuite() {
    this.router.navigate(['/dashboard/suites/' + this.suiteName]);
  }

  deleteResult() {
    this.postsService.deleteSuiteHistory(this.currentUser._id, this.suiteName, this.historyID).subscribe(() => {
      this.router.navigate(['/dashboard/suites/' + this.suiteName]);
    });
  }

  logout() {
    this.authenticationService.logout();
  }

}
