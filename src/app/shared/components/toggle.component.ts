import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-toggle',
  standalone: true,
  imports: [CommonModule, MatSlideToggleModule],
  template: `
    <mat-slide-toggle [checked]="on" (change)="changed.emit($event.checked)" color="primary" />
  `,
})
export class ToggleComponent {
  @Input() on = false;
  @Output() changed = new EventEmitter<boolean>();
}
