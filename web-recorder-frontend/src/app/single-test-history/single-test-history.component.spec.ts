import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SingleTestHistoryComponent } from './single-test-history.component';

describe('SingleTestHistoryComponent', () => {
  let component: SingleTestHistoryComponent;
  let fixture: ComponentFixture<SingleTestHistoryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SingleTestHistoryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SingleTestHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
