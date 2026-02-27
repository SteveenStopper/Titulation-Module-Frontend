import { CommonModule } from '@angular/common';
import { Component, ElementRef, forwardRef, HostListener, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

type AnyObj = Record<string, any>;

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative" [class.opacity-60]="disabled">
      <input
        #inputEl
        type="text"
        [disabled]="disabled"
        [(ngModel)]="search"
        (ngModelChange)="onSearchChange($event)"
        (focus)="open()"
        (blur)="onBlur()"
        [attr.placeholder]="placeholder"
        class="w-full rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-blue-600 bg-white"
      />

      <div
        *ngIf="openPanel && filtered.length"
        class="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-auto"
        [style.maxHeight]="maxPanelHeight"
      >
        <button
          type="button"
          *ngFor="let it of filtered; trackBy: trackByValue"
          (mousedown)="pick(it)"
          class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
        >
          {{ getLabel(it) }}
        </button>
      </div>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
})
export class SearchableSelectComponent implements ControlValueAccessor {
  @Input() items: AnyObj[] = [];
  @Input() labelKey = 'label';
  @Input() valueKey = 'value';
  @Input() placeholder = 'Seleccione';
  @Input() disabled = false;
  @Input() maxPanelHeight = '240px';
  @Input() fallbackLabel: string | null = null;

  @ViewChild('inputEl') inputEl?: ElementRef<HTMLInputElement>;

  search = '';
  openPanel = false;
  filtered: AnyObj[] = [];

  private value: any = null;
  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      if (this.value == null) return;
      const label = this.getLabel(this.findByValue(this.value));
      if (!label) return;
      const current = String(this.search || '').trim();
      const fallback = String(this.fallbackLabel || '').trim();
      if (!current || (fallback && current === fallback)) {
        this.search = String(label || '');
      }
      this.recompute();
    }
  }

  writeValue(obj: any): void {
    this.value = obj ?? null;
    const label = this.value != null ? this.getLabel(this.findByValue(this.value)) : '';
    this.search = label || (this.value != null ? String(this.fallbackLabel || '') : '') || '';
    this.recompute();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  trackByValue = (_: number, it: AnyObj) => this.getValue(it);

  open() {
    if (this.disabled) return;
    this.openPanel = true;
    this.recompute();
  }

  onSearchChange(v: string) {
    this.search = String(v ?? '');
    this.open();
    this.recompute();
  }

  onBlur() {
    this.onTouched();
    const v = String(this.search || '').trim();
    if (!v) {
      this.setValue(null);
      this.close();
      return;
    }

    const match = (this.items || []).find((it) => String(this.getLabel(it)).trim() === v);
    if (match) {
      this.setValue(this.getValue(match));
      this.search = String(this.getLabel(match) || '');
    } else {
      this.setValue(null);
    }

    this.close();
  }

  pick(it: AnyObj) {
    if (this.disabled) return;
    this.setValue(this.getValue(it));
    this.search = String(this.getLabel(it) || '');
    this.close();
    queueMicrotask(() => {
      try {
        this.inputEl?.nativeElement?.blur();
      } catch {
        /* noop */
      }
    });
  }

  private setValue(v: any) {
    this.value = v ?? null;
    this.onChange(this.value);
  }

  private close() {
    this.openPanel = false;
  }

  private recompute() {
    const list = Array.isArray(this.items) ? this.items : [];
    const q = this.normalize(this.search);
    if (!q) {
      this.filtered = list.slice(0, 50);
      return;
    }
    this.filtered = list
      .filter((it) => this.normalize(this.getLabel(it)).includes(q))
      .slice(0, 50);
  }

  private findByValue(v: any) {
    return (this.items || []).find((it) => String(this.getValue(it)) === String(v));
  }

  getLabel(it: AnyObj | undefined | null) {
    if (!it) return '';
    return String((it as any)?.[this.labelKey] ?? '');
  }

  private getValue(it: AnyObj | undefined | null) {
    if (!it) return null;
    return (it as any)?.[this.valueKey] ?? null;
  }

  private normalize(s: string) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const target = ev.target as Node | null;
    if (!target) return;
    const host = this.inputEl?.nativeElement?.closest('app-searchable-select');
    if (!host) return;
    if (!host.contains(target)) this.close();
  }
}
