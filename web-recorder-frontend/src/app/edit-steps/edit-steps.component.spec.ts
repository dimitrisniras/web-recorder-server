import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditStepsComponent } from './edit-steps.component';

describe('EditStepsComponent', () => {
  let component: EditStepsComponent;
  let fixture: ComponentFixture<EditStepsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditStepsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditStepsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
