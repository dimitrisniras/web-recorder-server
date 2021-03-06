import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-documentation',
  templateUrl: './documentation.component.html',
  styleUrls: ['./documentation.component.css']
})
export class DocumentationComponent implements OnInit {
  pageId = 'Getting Started';
  headline = 'Documentation';
  serverURL = 'http://snf-750380.vm.okeanos.grnet.gr:4000/';
  websiteURL = 'http://snf-750380.vm.okeanos.grnet.gr';

  constructor() { }

  ngOnInit() { }

  changePage(pageId: string) {
    this.pageId = pageId;

    if (pageId === 'Getting Started') {
      this.headline = 'Documentation';
    } else {
      this.headline = pageId;
    }
  }

}
