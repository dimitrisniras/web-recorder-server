import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from '../services/alert.service';
import { PostsService } from '../services/posts.service';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css']
})
export class SignUpComponent implements OnInit {
  model: any = {
    suites: [],
    tests: [],
  };

  constructor(private router: Router, private postsService: PostsService, private alertService: AlertService) { }

  ngOnInit() { }

  register() {
    this.postsService.createUser(this.model).subscribe(data => {
        this.alertService.success('Registration successful', true);
    },
    error => {
        this.alertService.error(error._body);
    });
  }

}
