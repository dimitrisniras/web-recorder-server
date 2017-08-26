import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PostsService } from '../services/posts.service';
import { AuthService } from '../services/auth.service';
import { User } from '../user';

@Component({
  selector: 'app-single-test-history',
  templateUrl: './single-test-history.component.html',
  styleUrls: ['./single-test-history.component.css']
})
export class SingleTestHistoryComponent implements OnInit {
  currentUser: User;
  suiteName: string;
  historyID: string;
  testName: string;
  test: any[];
  preconditions: any[];
  postconditions: any[];

  // tslint:disable-next-line:max-line-length
  constructor(private postsService: PostsService, private router: Router, route: ActivatedRoute, private authenticationService: AuthService) {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.suiteName = route.snapshot.params['suite'];
    this.historyID = route.snapshot.params['id'];
    this.testName = route.snapshot.params['test'];
  }

  ngOnInit() {
    this.postsService.getSuiteTestHistory(this.currentUser._id, this.suiteName, this.historyID, this.testName).subscribe(test => {
      this.test = test;
      this.preconditions = test.preconditions;
      this.postconditions = test.postconditions;
    });
  }

  returnToTest() {
    this.router.navigate(['/dashboard/suites/' + this.suiteName + '/tests/' + this.testName]);
  }

  deleteResult() {
    this.postsService.deleteSuiteTestHistory(this.currentUser._id, this.suiteName, this.historyID, this.testName).subscribe(() => {
      this.router.navigate(['/dashboard/suites/' + this.suiteName + '/history/' + this.historyID]);
    });
  }

  logout() {
    this.authenticationService.logout();
  }

}
