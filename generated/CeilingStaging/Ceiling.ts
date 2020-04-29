// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  EthereumCall,
  EthereumEvent,
  SmartContract,
  EthereumValue,
  JSONValue,
  TypedMap,
  Entity,
  EthereumTuple,
  Bytes,
  Address,
  BigInt,
  CallResult
} from "@graphprotocol/graph-ts";

export class LogNote extends EthereumEvent {
  get params(): LogNote__Params {
    return new LogNote__Params(this);
  }
}

export class LogNote__Params {
  _event: LogNote;

  constructor(event: LogNote) {
    this._event = event;
  }

  get sig(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get guy(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get foo(): Bytes {
    return this._event.parameters[2].value.toBytes();
  }

  get bar(): Bytes {
    return this._event.parameters[3].value.toBytes();
  }

  get wad(): BigInt {
    return this._event.parameters[4].value.toBigInt();
  }

  get fax(): Bytes {
    return this._event.parameters[5].value.toBytes();
  }
}

export class Ceiling extends SmartContract {
  static bind(address: Address): Ceiling {
    return new Ceiling("Ceiling", address);
  }

  ceiling(param0: BigInt): BigInt {
    let result = super.call("ceiling", [
      EthereumValue.fromUnsignedBigInt(param0)
    ]);

    return result[0].toBigInt();
  }

  try_ceiling(param0: BigInt): CallResult<BigInt> {
    let result = super.tryCall("ceiling", [
      EthereumValue.fromUnsignedBigInt(param0)
    ]);
    if (result.reverted) {
      return new CallResult();
    }
    let value = result.value;
    return CallResult.fromValue(value[0].toBigInt());
  }

  rdiv(x: BigInt, y: BigInt): BigInt {
    let result = super.call("rdiv", [
      EthereumValue.fromUnsignedBigInt(x),
      EthereumValue.fromUnsignedBigInt(y)
    ]);

    return result[0].toBigInt();
  }

  try_rdiv(x: BigInt, y: BigInt): CallResult<BigInt> {
    let result = super.tryCall("rdiv", [
      EthereumValue.fromUnsignedBigInt(x),
      EthereumValue.fromUnsignedBigInt(y)
    ]);
    if (result.reverted) {
      return new CallResult();
    }
    let value = result.value;
    return CallResult.fromValue(value[0].toBigInt());
  }

  rmul(x: BigInt, y: BigInt): BigInt {
    let result = super.call("rmul", [
      EthereumValue.fromUnsignedBigInt(x),
      EthereumValue.fromUnsignedBigInt(y)
    ]);

    return result[0].toBigInt();
  }

  try_rmul(x: BigInt, y: BigInt): CallResult<BigInt> {
    let result = super.tryCall("rmul", [
      EthereumValue.fromUnsignedBigInt(x),
      EthereumValue.fromUnsignedBigInt(y)
    ]);
    if (result.reverted) {
      return new CallResult();
    }
    let value = result.value;
    return CallResult.fromValue(value[0].toBigInt());
  }

  safeAdd(x: BigInt, y: BigInt): BigInt {
    let result = super.call("safeAdd", [
      EthereumValue.fromUnsignedBigInt(x),
      EthereumValue.fromUnsignedBigInt(y)
    ]);

    return result[0].toBigInt();
  }

  try_safeAdd(x: BigInt, y: BigInt): CallResult<BigInt> {
    let result = super.tryCall("safeAdd", [
      EthereumValue.fromUnsignedBigInt(x),
      EthereumValue.fromUnsignedBigInt(y)
    ]);
    if (result.reverted) {
      return new CallResult();
    }
    let value = result.value;
    return CallResult.fromValue(value[0].toBigInt());
  }

  safeDiv(x: BigInt, y: BigInt): BigInt {
    let result = super.call("safeDiv", [
      EthereumValue.fromUnsignedBigInt(x),
      EthereumValue.fromUnsignedBigInt(y)
    ]);

    return result[0].toBigInt();
  }

  try_safeDiv(x: BigInt, y: BigInt): CallResult<BigInt> {
    let result = super.tryCall("safeDiv", [
      EthereumValue.fromUnsignedBigInt(x),
      EthereumValue.fromUnsignedBigInt(y)
    ]);
    if (result.reverted) {
      return new CallResult();
    }
    let value = result.value;
    return CallResult.fromValue(value[0].toBigInt());
  }

  safeMul(x: BigInt, y: BigInt): BigInt {
    let result = super.call("safeMul", [
      EthereumValue.fromUnsignedBigInt(x),
      EthereumValue.fromUnsignedBigInt(y)
    ]);

    return result[0].toBigInt();
  }

  try_safeMul(x: BigInt, y: BigInt): CallResult<BigInt> {
    let result = super.tryCall("safeMul", [
      EthereumValue.fromUnsignedBigInt(x),
      EthereumValue.fromUnsignedBigInt(y)
    ]);
    if (result.reverted) {
      return new CallResult();
    }
    let value = result.value;
    return CallResult.fromValue(value[0].toBigInt());
  }

  safeSub(x: BigInt, y: BigInt): BigInt {
    let result = super.call("safeSub", [
      EthereumValue.fromUnsignedBigInt(x),
      EthereumValue.fromUnsignedBigInt(y)
    ]);

    return result[0].toBigInt();
  }

  try_safeSub(x: BigInt, y: BigInt): CallResult<BigInt> {
    let result = super.tryCall("safeSub", [
      EthereumValue.fromUnsignedBigInt(x),
      EthereumValue.fromUnsignedBigInt(y)
    ]);
    if (result.reverted) {
      return new CallResult();
    }
    let value = result.value;
    return CallResult.fromValue(value[0].toBigInt());
  }

  wards(param0: Address): BigInt {
    let result = super.call("wards", [EthereumValue.fromAddress(param0)]);

    return result[0].toBigInt();
  }

  try_wards(param0: Address): CallResult<BigInt> {
    let result = super.tryCall("wards", [EthereumValue.fromAddress(param0)]);
    if (result.reverted) {
      return new CallResult();
    }
    let value = result.value;
    return CallResult.fromValue(value[0].toBigInt());
  }
}

export class ConstructorCall extends EthereumCall {
  get inputs(): ConstructorCall__Inputs {
    return new ConstructorCall__Inputs(this);
  }

  get outputs(): ConstructorCall__Outputs {
    return new ConstructorCall__Outputs(this);
  }
}

export class ConstructorCall__Inputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }
}

export class ConstructorCall__Outputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }
}

export class BorrowCall extends EthereumCall {
  get inputs(): BorrowCall__Inputs {
    return new BorrowCall__Inputs(this);
  }

  get outputs(): BorrowCall__Outputs {
    return new BorrowCall__Outputs(this);
  }
}

export class BorrowCall__Inputs {
  _call: BorrowCall;

  constructor(call: BorrowCall) {
    this._call = call;
  }

  get loan(): BigInt {
    return this._call.inputValues[0].value.toBigInt();
  }

  get amount(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }
}

export class BorrowCall__Outputs {
  _call: BorrowCall;

  constructor(call: BorrowCall) {
    this._call = call;
  }
}

export class DenyCall extends EthereumCall {
  get inputs(): DenyCall__Inputs {
    return new DenyCall__Inputs(this);
  }

  get outputs(): DenyCall__Outputs {
    return new DenyCall__Outputs(this);
  }
}

export class DenyCall__Inputs {
  _call: DenyCall;

  constructor(call: DenyCall) {
    this._call = call;
  }

  get usr(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class DenyCall__Outputs {
  _call: DenyCall;

  constructor(call: DenyCall) {
    this._call = call;
  }
}

export class FileCall extends EthereumCall {
  get inputs(): FileCall__Inputs {
    return new FileCall__Inputs(this);
  }

  get outputs(): FileCall__Outputs {
    return new FileCall__Outputs(this);
  }
}

export class FileCall__Inputs {
  _call: FileCall;

  constructor(call: FileCall) {
    this._call = call;
  }

  get what(): Bytes {
    return this._call.inputValues[0].value.toBytes();
  }

  get loan(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }

  get ceiling(): BigInt {
    return this._call.inputValues[2].value.toBigInt();
  }
}

export class FileCall__Outputs {
  _call: FileCall;

  constructor(call: FileCall) {
    this._call = call;
  }
}

export class RelyCall extends EthereumCall {
  get inputs(): RelyCall__Inputs {
    return new RelyCall__Inputs(this);
  }

  get outputs(): RelyCall__Outputs {
    return new RelyCall__Outputs(this);
  }
}

export class RelyCall__Inputs {
  _call: RelyCall;

  constructor(call: RelyCall) {
    this._call = call;
  }

  get usr(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class RelyCall__Outputs {
  _call: RelyCall;

  constructor(call: RelyCall) {
    this._call = call;
  }
}

export class RepayCall extends EthereumCall {
  get inputs(): RepayCall__Inputs {
    return new RepayCall__Inputs(this);
  }

  get outputs(): RepayCall__Outputs {
    return new RepayCall__Outputs(this);
  }
}

export class RepayCall__Inputs {
  _call: RepayCall;

  constructor(call: RepayCall) {
    this._call = call;
  }

  get loan(): BigInt {
    return this._call.inputValues[0].value.toBigInt();
  }

  get amount(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }
}

export class RepayCall__Outputs {
  _call: RepayCall;

  constructor(call: RepayCall) {
    this._call = call;
  }
}