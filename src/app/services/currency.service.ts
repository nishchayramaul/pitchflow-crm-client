import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$',    name: 'US Dollar' },
  { code: 'EUR', symbol: '€',    name: 'Euro' },
  { code: 'GBP', symbol: '£',    name: 'British Pound' },
  { code: 'INR', symbol: '₹',    name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥',    name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$',  name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr',   name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥',    name: 'Chinese Yuan' },
  { code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ',  name: 'UAE Dirham' },
  { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$',  name: 'Mexican Peso' },
  { code: 'KRW', symbol: '₩',    name: 'Korean Won' },
  { code: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar' },
  { code: 'SEK', symbol: 'kr',   name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr',   name: 'Norwegian Krone' },
  { code: 'NZD', symbol: 'NZ$',  name: 'New Zealand Dollar' },
  { code: 'ZAR', symbol: 'R',    name: 'South African Rand' },
  { code: 'SAR', symbol: '﷼',   name: 'Saudi Riyal' },
  { code: 'MYR', symbol: 'RM',   name: 'Malaysian Ringgit' },
  { code: 'THB', symbol: '฿',    name: 'Thai Baht' },
  { code: 'IDR', symbol: 'Rp',   name: 'Indonesian Rupiah' },
  { code: 'PHP', symbol: '₱',    name: 'Philippine Peso' },
  { code: 'TRY', symbol: '₺',    name: 'Turkish Lira' },
  { code: 'UAH', symbol: '₴',    name: 'Ukrainian Hryvnia' },
  { code: 'NGN', symbol: '₦',    name: 'Nigerian Naira' },
  { code: 'PKR', symbol: '₨',    name: 'Pakistani Rupee' },
  { code: 'EGP', symbol: 'E£',   name: 'Egyptian Pound' },
  { code: 'DKK', symbol: 'kr',   name: 'Danish Krone' },
];

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly _code = new BehaviorSubject<string>('USD');
  readonly code$ = this._code.asObservable();

  get code(): string { return this._code.value; }

  get symbol(): string {
    return CURRENCIES.find(c => c.code === this._code.value)?.symbol ?? '$';
  }

  set(code: string): void {
    if (CURRENCIES.some(c => c.code === code)) {
      this._code.next(code);
    }
  }
}
