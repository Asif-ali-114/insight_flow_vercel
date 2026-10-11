#!/usr/bin/env python3
"""Rule-based cleaning for a sales export (the same rules as the website demo).

Usage:
    python clean_sales.py input.csv [--date-order dmy|mdy] [--keep-duplicates]

Expected columns: Order ID, Product, Date, Quantity, Unit Price
Writes cleaned.csv and quality_report.csv next to the input file.

Principles
  * Standardize formatting that is safe to standardize (case, spaces, date style, currency text).
  * Remove only EXACT duplicates (same order ID, product, date, quantity, price after standardizing).
  * Never invent values. Missing or invalid values are kept and flagged for a person to decide.
  * Negative quantities are flagged, not changed: they may be returns.
Requires: pandas (pip install pandas)
"""
import argparse
import re
from pathlib import Path

import pandas as pd

REQUIRED = ["Order ID", "Product", "Date", "Quantity", "Unit Price"]


def blank(v):
    return v is None or (isinstance(v, float) and pd.isna(v)) or str(v).strip() == ""


def parse_date(raw, order):
    """Return (iso_string | None, status, was_reformatted). Slash dates use the stated order."""
    if blank(raw):
        return None, "missing", False
    s = re.sub(r"\s+", " ", str(raw)).strip()
    m = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", s)
    parts, reformat = None, False
    if m:
        parts, reformat = (int(m[1]), int(m[2]), int(m[3])), not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s)
    elif (m := re.fullmatch(r"(\d{4})/(\d{1,2})/(\d{1,2})", s)):
        parts, reformat = (int(m[1]), int(m[2]), int(m[3])), True
    elif (m := re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)):
        a, b, y = int(m[1]), int(m[2]), int(m[3])
        parts, reformat = ((y, b, a) if order == "dmy" else (y, a, b)), True
    if parts is None:
        return None, "invalid", False
    try:
        return pd.Timestamp(*parts).strftime("%Y-%m-%d"), "ok", reformat
    except ValueError:
        return None, "invalid", False


def parse_money(raw):
    if blank(raw):
        return None, "missing", False
    s = re.sub(r"\s+", " ", str(raw)).strip()
    stripped = re.sub(r"\s?(USD|usd|\$)$", "", re.sub(r"^\$\s?", "", s)).replace(",", "")
    if not re.fullmatch(r"-?\d+(\.\d+)?", stripped) or float(stripped) < 0:
        return None, "invalid", False
    value = float(stripped)
    return (int(value) if value.is_integer() else value), "ok", not re.fullmatch(r"-?\d+(\.\d+)?", s)


def clean(df, order="dmy", keep_duplicates=False):
    missing_cols = [c for c in REQUIRED if c not in df.columns]
    if missing_cols:
        raise SystemExit(f"Missing expected column(s): {', '.join(missing_cols)}")
    df = df[REQUIRED].astype(object)
    canonical = {}
    out, report, seen = [], {}, {}

    def note(key):
        report[key] = report.get(key, 0) + 1

    for idx, row in df.iterrows():
        notes, flagged = [], False
        # product
        prod = row["Product"]
        if blank(prod):
            product = ""
            notes.append("Product name is missing")
            note("Missing product name"); flagged = True
        else:
            collapsed = re.sub(r"\s+", " ", str(prod)).strip()
            product = canonical.setdefault(collapsed.lower(), collapsed.title() if collapsed == collapsed.lower() or collapsed == collapsed.upper() else collapsed)
            if str(prod) != collapsed:
                note("Extra whitespace")
            if collapsed != product:
                note("Inconsistent capitalization")
        # date
        date, d_status, d_fmt = parse_date(row["Date"], order)
        if d_status == "missing":
            notes.append("Date is missing"); note("Missing date"); flagged = True
        elif d_status == "invalid":
            notes.append(f'Date "{row["Date"]}" is not a real date'); note("Invalid date"); flagged = True
            date = str(row["Date"])
        elif d_fmt:
            note("Non-standard date format")
        # quantity
        qty = row["Quantity"]
        if blank(qty):
            notes.append("Quantity is missing"); note("Missing quantity"); flagged = True; qty = ""
        else:
            try:
                q = float(str(qty).strip())
                if not q.is_integer():
                    notes.append(f"Quantity {q:g} is not a whole number"); note("Non-whole quantity"); flagged = True
                else:
                    q = int(q)
                    if q < 0:
                        notes.append(f"Negative quantity ({q}) - may be a return"); note("Negative quantity (possible return)"); flagged = True
                    elif q == 0:
                        notes.append("Quantity is zero"); note("Zero quantity"); flagged = True
                qty = q
            except ValueError:
                notes.append(f'Quantity "{qty}" is not a number'); note("Non-numeric quantity"); flagged = True
        # price
        price, p_status, p_fmt = parse_money(row["Unit Price"])
        if p_status == "missing":
            notes.append("Unit price is missing"); note("Missing unit price"); flagged = True; price = ""
        elif p_status == "invalid":
            notes.append(f'Unit price "{row["Unit Price"]}" is not valid'); note("Invalid unit price"); flagged = True; price = row["Unit Price"]
        elif p_fmt:
            note("Currency formatting in price")
        # exact duplicate rule
        key = (str(row["Order ID"]).strip(), product, date, qty, price)
        duplicate = (not blank(row["Order ID"])) and d_status != "invalid" and key in seen
        if duplicate:
            note("Exact duplicate rows")
            if not keep_duplicates:
                continue
            notes.append(f"Exact duplicate of row {seen[key] + 1}"); flagged = True
        else:
            seen.setdefault(key, idx)
        out.append({"Order ID": row["Order ID"], "Product": product, "Date": date, "Quantity": qty, "Unit Price": price,
                    "Review Status": "Needs review" if flagged else "OK", "Review Notes": "; ".join(notes)})
    cleaned = pd.DataFrame(out, dtype=object)
    summary = {
        "Records reviewed": len(df),
        "Records after cleaning": len(cleaned),
        "Records flagged for manual review": int((cleaned["Review Status"] == "Needs review").sum()),
    }
    rows = [{"Section": "Issue", "Item": k, "Count": v} for k, v in sorted(report.items())]
    rows += [{"Section": "Summary", "Item": k, "Count": v} for k, v in summary.items()]
    return cleaned, pd.DataFrame(rows)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("--date-order", choices=["dmy", "mdy"], default="dmy", help="how to read dd/mm vs mm/dd slash dates (default dmy)")
    ap.add_argument("--keep-duplicates", action="store_true", help="keep exact duplicates and flag them instead of removing")
    a = ap.parse_args()
    src = Path(a.input)
    df = pd.read_csv(src, dtype=str, keep_default_na=False)
    cleaned, report = clean(df, a.date_order, a.keep_duplicates)
    cleaned.to_csv(src.with_name("cleaned.csv"), index=False)
    report.to_csv(src.with_name("quality_report.csv"), index=False)
    print(report.to_string(index=False))


if __name__ == "__main__":
    main()
