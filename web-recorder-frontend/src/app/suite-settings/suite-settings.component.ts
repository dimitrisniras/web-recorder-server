import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PostsService } from '../services/posts.service';
import { AuthService } from '../services/auth.service';
import { User } from '../user';

@Component({
  selector: 'app-suite-settings',
  templateUrl: './suite-settings.component.html',
  styleUrls: ['./suite-settings.component.css']
})
export class SuiteSettingsComponent implements OnInit {
  currentUser: User;
  suiteName: string;
  oldSuiteName: string;
  suite: any;
  message: string;

  // tslint:disable-next-line:max-line-length
  constructor(private postsService: PostsService, private router: Router, route: ActivatedRoute, private authenticationService: AuthService) {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.suiteName = route.snapshot.params['suite'];
    this.oldSuiteName = this.suiteName;
  }

  ngOnInit() {
    this.postsService.getSuite(this.currentUser._id, this.suiteName).subscribe(suite => { this.suite = suite; });
  }

  deleteSuite() {
    this.postsService.deleteSuite(this.currentUser._id, this.suiteName).subscribe(() => {
      this.router.navigate(['/dashboard']);
    });
  }

  onSave() {
    // tslint:disable-next-line:max-line-length
    if (this.suiteName !== '') {
      this.postsService.updateSuiteSettings(this.currentUser._id, this.oldSuiteName, { 'suiteName': this.suiteName, 'schedule': this.suite.schedule }).subscribe(data => {
        this.router.navigate(['/dashboard/suites/' + this.suiteName]);
      }, error => {
        this.message = error._body;
      });
    } else {
      this.message = 'Suite name can not be blank';
    }
  }

  onCancel() {
    this.router.navigate(['/dashboard/suites/' + this.oldSuiteName]);
  }

  logout() {
    this.authenticationService.logout();
  }

}
