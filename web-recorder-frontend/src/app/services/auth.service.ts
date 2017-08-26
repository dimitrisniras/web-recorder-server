import { Injectable } from '@angular/core';
import { Http, Headers, Response } from '@angular/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

@Injectable()
export class AuthService {
  serverURL = 'http://snf-766614.vm.okeanos.grnet.gr:4000/';

  constructor(private http: Http, private router: Router) { }

  login(email: string, password: string) {
    return this.http.post(this.serverURL + 'authenticate', { email: email, password: password }).map((response: Response) => {
      // login successful if there's a jwt token in the response
      let user = response.json();
      if (user && user.token) {
        // store user details and jwt token in local storage to keep user logged in between page refreshes
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
    });
  }

  logout() {
    // remove user from local storage to log user out
    localStorage.removeItem('currentUser');
    this.router.navigate(['/']);
  }

}
