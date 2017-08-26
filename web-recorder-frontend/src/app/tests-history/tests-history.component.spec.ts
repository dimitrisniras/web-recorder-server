import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TestsHistoryComponent } from './tests-history.component';

describe('TestsHistoryComponent', () => {
  let component: TestsHistoryComponent;
  let fixture: ComponentFixture<TestsHistoryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TestsHistoryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestsHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
