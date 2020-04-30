// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  TypedMap,
  Entity,
  Value,
  ValueKind,
  store,
  Address,
  Bytes,
  BigInt,
  BigDecimal
} from "@graphprotocol/graph-ts";

export class Pool extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Pool entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Pool entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Pool", id.toString(), this);
  }

  static load(id: string): Pool | null {
    return store.get("Pool", id) as Pool | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get loans(): Array<string> {
    let value = this.get("loans");
    return value.toStringArray();
  }

  set loans(value: Array<string>) {
    this.set("loans", Value.fromStringArray(value));
  }

  get totalDebt(): BigInt {
    let value = this.get("totalDebt");
    return value.toBigInt();
  }

  set totalDebt(value: BigInt) {
    this.set("totalDebt", Value.fromBigInt(value));
  }

  get totalBorrowsCount(): i32 {
    let value = this.get("totalBorrowsCount");
    return value.toI32();
  }

  set totalBorrowsCount(value: i32) {
    this.set("totalBorrowsCount", Value.fromI32(value));
  }

  get totalBorrowsAggregatedAmount(): BigInt {
    let value = this.get("totalBorrowsAggregatedAmount");
    return value.toBigInt();
  }

  set totalBorrowsAggregatedAmount(value: BigInt) {
    this.set("totalBorrowsAggregatedAmount", Value.fromBigInt(value));
  }

  get totalRepaysCount(): i32 {
    let value = this.get("totalRepaysCount");
    return value.toI32();
  }

  set totalRepaysCount(value: i32) {
    this.set("totalRepaysCount", Value.fromI32(value));
  }

  get totalRepaysAggregatedAmount(): BigInt {
    let value = this.get("totalRepaysAggregatedAmount");
    return value.toBigInt();
  }

  set totalRepaysAggregatedAmount(value: BigInt) {
    this.set("totalRepaysAggregatedAmount", Value.fromBigInt(value));
  }

  get weightedInterestRate(): BigInt {
    let value = this.get("weightedInterestRate");
    return value.toBigInt();
  }

  set weightedInterestRate(value: BigInt) {
    this.set("weightedInterestRate", Value.fromBigInt(value));
  }

  get seniorDebt(): BigInt {
    let value = this.get("seniorDebt");
    return value.toBigInt();
  }

  set seniorDebt(value: BigInt) {
    this.set("seniorDebt", Value.fromBigInt(value));
  }

  get minJuniorRatio(): BigInt {
    let value = this.get("minJuniorRatio");
    return value.toBigInt();
  }

  set minJuniorRatio(value: BigInt) {
    this.set("minJuniorRatio", Value.fromBigInt(value));
  }

  get currentJuniorRatio(): BigInt {
    let value = this.get("currentJuniorRatio");
    return value.toBigInt();
  }

  set currentJuniorRatio(value: BigInt) {
    this.set("currentJuniorRatio", Value.fromBigInt(value));
  }
}

export class Loan extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Loan entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Loan entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Loan", id.toString(), this);
  }

  static load(id: string): Loan | null {
    return store.get("Loan", id) as Loan | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get pool(): string {
    let value = this.get("pool");
    return value.toString();
  }

  set pool(value: string) {
    this.set("pool", Value.fromString(value));
  }

  get index(): i32 {
    let value = this.get("index");
    return value.toI32();
  }

  set index(value: i32) {
    this.set("index", Value.fromI32(value));
  }

  get nftId(): string | null {
    let value = this.get("nftId");
    if (value === null) {
      return null;
    } else {
      return value.toString();
    }
  }

  set nftId(value: string | null) {
    if (value === null) {
      this.unset("nftId");
    } else {
      this.set("nftId", Value.fromString(value as string));
    }
  }

  get nftRegistry(): Bytes {
    let value = this.get("nftRegistry");
    return value.toBytes();
  }

  set nftRegistry(value: Bytes) {
    this.set("nftRegistry", Value.fromBytes(value));
  }

  get owner(): Bytes {
    let value = this.get("owner");
    return value.toBytes();
  }

  set owner(value: Bytes) {
    this.set("owner", Value.fromBytes(value));
  }

  get opened(): i32 {
    let value = this.get("opened");
    return value.toI32();
  }

  set opened(value: i32) {
    this.set("opened", Value.fromI32(value));
  }

  get closed(): i32 {
    let value = this.get("closed");
    return value.toI32();
  }

  set closed(value: i32) {
    this.set("closed", Value.fromI32(value));
  }

  get debt(): BigInt {
    let value = this.get("debt");
    return value.toBigInt();
  }

  set debt(value: BigInt) {
    this.set("debt", Value.fromBigInt(value));
  }

  get interestRatePerSecond(): BigInt | null {
    let value = this.get("interestRatePerSecond");
    if (value === null) {
      return null;
    } else {
      return value.toBigInt();
    }
  }

  set interestRatePerSecond(value: BigInt | null) {
    if (value === null) {
      this.unset("interestRatePerSecond");
    } else {
      this.set("interestRatePerSecond", Value.fromBigInt(value as BigInt));
    }
  }

  get ceiling(): BigInt | null {
    let value = this.get("ceiling");
    if (value === null) {
      return null;
    } else {
      return value.toBigInt();
    }
  }

  set ceiling(value: BigInt | null) {
    if (value === null) {
      this.unset("ceiling");
    } else {
      this.set("ceiling", Value.fromBigInt(value as BigInt));
    }
  }

  get threshold(): BigInt | null {
    let value = this.get("threshold");
    if (value === null) {
      return null;
    } else {
      return value.toBigInt();
    }
  }

  set threshold(value: BigInt | null) {
    if (value === null) {
      this.unset("threshold");
    } else {
      this.set("threshold", Value.fromBigInt(value as BigInt));
    }
  }

  get borrowsCount(): i32 {
    let value = this.get("borrowsCount");
    return value.toI32();
  }

  set borrowsCount(value: i32) {
    this.set("borrowsCount", Value.fromI32(value));
  }

  get borrowsAggregatedAmount(): BigInt {
    let value = this.get("borrowsAggregatedAmount");
    return value.toBigInt();
  }

  set borrowsAggregatedAmount(value: BigInt) {
    this.set("borrowsAggregatedAmount", Value.fromBigInt(value));
  }

  get repaysCount(): i32 {
    let value = this.get("repaysCount");
    return value.toI32();
  }

  set repaysCount(value: i32) {
    this.set("repaysCount", Value.fromI32(value));
  }

  get repaysAggregatedAmount(): BigInt {
    let value = this.get("repaysAggregatedAmount");
    return value.toBigInt();
  }

  set repaysAggregatedAmount(value: BigInt) {
    this.set("repaysAggregatedAmount", Value.fromBigInt(value));
  }
}

export class Proxy extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Proxy entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Proxy entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Proxy", id.toString(), this);
  }

  static load(id: string): Proxy | null {
    return store.get("Proxy", id) as Proxy | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get owner(): Bytes {
    let value = this.get("owner");
    return value.toBytes();
  }

  set owner(value: Bytes) {
    this.set("owner", Value.fromBytes(value));
  }
}
