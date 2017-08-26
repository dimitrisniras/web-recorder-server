import { Component, OnInit } from '@angular/core';
import { PostsService } from '../services/posts.service';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../user';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser: User;
  suites: any[];
  testsNumber: any[];
  newSuiteName: string;
  message: string;
  stats: any;

  constructor(private postsService: PostsService, private router: Router, private authenticationService: AuthService) {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
  }

  ngOnInit() {
    this.postsService.getSuites(this.currentUser._id).subscribe(suites => {
      this.suites = suites.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    });

    this.postsService.getStats(this.currentUser._id).subscribe(stats => { this.stats = stats; });
  }

  onClickListener(suite: string) {
    this.router.navigate(['/dashboard/suites', suite]);
  }

  createNewSuite() {
    if (this.newSuiteName !== undefined) {
      this.postsService.createNewSuite(this.currentUser._id, this.newSuiteName).subscribe(data => {
        this.newSuiteName = '';
        this.message = '';
        this.postsService.getSuites(this.currentUser._id).subscribe(suites => {
          this.suites = suites.sort(function (a, b) {
            return a.name.localeCompare(b.name);
          });
        });

        this.postsService.getStats(this.currentUser._id).subscribe(stats => { this.stats = stats; });
      }, error => {
        this.message = error._body;
      });
    } else {
      this.message = 'Suite name can not be blank';
    }
  }

  logout() {
    this.authenticationService.logout();
  }

}
