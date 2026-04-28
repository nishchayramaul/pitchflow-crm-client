import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CURRENCIES, Currency } from '../../services/currency.service';

const ITEM_HEIGHT = 44;
const VISIBLE_HALF = 2;
const WHEEL_THRESHOLD = 80; // px accumulated before moving one step

@Component({
  selector: 'app-currency-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './currency-picker.component.html',
  styleUrl: './currency-picker.component.scss',
})
export class CurrencyPickerComponent implements OnInit {
  @Input() value = 'USD';
  @Output() valueChange = new EventEmitter<string>();

  readonly currencies: Currency[] = CURRENCIES;
  selectedIndex = 0;
  searchQuery = '';

  private dragStartY = 0;
  private dragStartIndex = 0;
  private wheelAccum = 0;

  ngOnInit(): void {
    const idx = this.currencies.findIndex(c => c.code === this.value);
    this.selectedIndex = idx >= 0 ? idx : 0;
  }

  get isSearching(): boolean {
    return this.searchQuery.trim().length > 0;
  }

  get filteredCurrencies(): Currency[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.currencies;
    return this.currencies.filter(
      c =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }

  get selectedCurrency(): Currency {
    return this.currencies[this.selectedIndex];
  }

  get trackTransform(): string {
    const offset = (VISIBLE_HALF - this.selectedIndex) * ITEM_HEIGHT;
    return `translateY(${offset}px)`;
  }

  itemOpacity(i: number): number {
    const d = Math.abs(i - this.selectedIndex);
    if (d === 0) return 1;
    if (d === 1) return 0.5;
    if (d === 2) return 0.2;
    return 0.06;
  }

  itemScale(i: number): number {
    const d = Math.abs(i - this.selectedIndex);
    if (d === 0) return 1;
    if (d === 1) return 0.92;
    return 0.84;
  }

  select(i: number): void {
    this.selectedIndex = i;
    this.emit();
  }

  selectFromSearch(c: Currency): void {
    const idx = this.currencies.findIndex(x => x.code === c.code);
    if (idx >= 0) {
      this.selectedIndex = idx;
      this.emit();
    }
    this.searchQuery = '';
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.wheelAccum += e.deltaY;
    if (Math.abs(this.wheelAccum) >= WHEEL_THRESHOLD) {
      this.move(this.wheelAccum > 0 ? 1 : -1);
      this.wheelAccum = 0;
    }
  }

  onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); this.move(-1); }
  }

  onDragStart(e: MouseEvent): void {
    this.dragStartY = e.clientY;
    this.dragStartIndex = this.selectedIndex;

    const onMove = (ev: MouseEvent) => {
      const delta = Math.round((ev.clientY - this.dragStartY) / ITEM_HEIGHT);
      this.selectedIndex = this.clamp(this.dragStartIndex + delta);
    };
    const onUp = () => {
      this.emit();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  onTouchStart(e: TouchEvent): void {
    const startY = e.touches[0].clientY;
    const startIndex = this.selectedIndex;

    const onMove = (ev: TouchEvent) => {
      const delta = Math.round((ev.touches[0].clientY - startY) / ITEM_HEIGHT);
      this.selectedIndex = this.clamp(startIndex + delta);
    };
    const onEnd = () => {
      this.emit();
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);
  }

  private move(delta: number): void {
    this.selectedIndex = this.clamp(this.selectedIndex + delta);
    this.emit();
  }

  private clamp(i: number): number {
    return Math.max(0, Math.min(this.currencies.length - 1, i));
  }

  private emit(): void {
    this.valueChange.emit(this.currencies[this.selectedIndex].code);
  }
}
