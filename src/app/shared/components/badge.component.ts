import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="badge" [ngClass]="cls">{{ status }}</span>`,
})
export class BadgeComponent {
  @Input() status = '';

  get cls(): string {
    const map: Record<string, string> = {
      Active: 'badge-green', Verified: 'badge-green', Healthy: 'badge-green', Completed: 'badge-green',
      Production: 'badge-red', Dead: 'badge-red', Error: 'badge-red',
      Staging: 'badge-amber', Warning: 'badge-amber', Retrying: 'badge-amber',
      Suspended: 'badge-amber', Pending: 'badge-amber',
      Development: 'badge-blue', Custom: 'badge-teal',
      Archived: 'badge-grey', Disabled: 'badge-grey', NotConfigured: 'badge-grey',
      ExchangeOnline: 'badge-blue',
    };
    return map[this.status] ?? 'badge-grey';
  }
}

@Component({
  selector: 'app-direction-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (value) {
      <span class="badge" [ngClass]="cls">{{ label }}</span>
    }
  `,
})
export class DirectionBadgeComponent {
  @Input() value = '';

  get cls(): string {
    const m: Record<string, string> = {
      Bidirectional: 'badge-green', SalesforceToPlatform: 'badge-blue',
      PlatformToSalesforce: 'badge-purple', Disabled: 'badge-grey',
    };
    return m[this.value] ?? 'badge-grey';
  }

  get label(): string {
    const m: Record<string, string> = {
      Bidirectional: '⇄ Bidir.', SalesforceToPlatform: '→ SF→Plat',
      PlatformToSalesforce: '← Plat→SF', Disabled: '⊘ Off',
    };
    return m[this.value] ?? this.value;
  }
}

@Component({
  selector: 'app-platform-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="badge" [ngClass]="cls">{{ label }}</span>`,
})
export class PlatformBadgeComponent {
  @Input() platform = '';

  get cls(): string {
    if (this.platform === 'ExchangeOnline') return 'badge-blue';
    return 'badge-grey';
  }

  get label(): string {
    if (this.platform === 'ExchangeOnline') return 'Exchange';
    return 'Unassigned';
  }
}
