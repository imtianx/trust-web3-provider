// Copyright © 2017-2022 Trust Wallet.
//
// This file is part of Trust. The full Trust copyright notice, including
// terms governing use, modification, and redistribution, is contained in the
// file LICENSE at the root of the source code distribution tree.

"use strict";

import BaseProvider from "./base_provider";
import Utils from "./utils";

const BtcNetworks = {
  mainnet: "livenet", // mainnet
  testnet: "testnet",
  segnit: "segnit",
}

class TrustBtcWeb3Provider extends BaseProvider {
  constructor(config) {
    super(config);
    this.providerNetwork = BtcNetworks.mainnet;
    this.callbacks = new Map();
    this._isConnected = false;

    try {
      this._network = "" + config.bitcoin.network;
    } catch (error) {
      console.log(error);
    }
    if (!(this._network in BtcNetworks)) {
      this._network = BtcNetworks.mainnet;
    }
  }

  setAddress(address) {
    this.address = address;
    this.ready = !!address;
  }

  connect() {
    return this.account().then((accountInfo) => {
      this._isConnected = true;
      this.emit("connect");
      return accountInfo;
    });
  }

  disconnect() {
    return new Promise((resolve) => {
      this.publicKey = null;
      this._isConnected = false;
      this.emit("disconnect");
      resolve();
    });
  }

  isConnected() {
    return this._isConnected;
  }

  account() {
    return this._request("requestAccounts", { network: this._network }).then((data) => {
      this.setAddress(data[0]);
      this.printLog(data)
      return data;
    });
  }

  network() {
    return this._network;
  }

  async requestAccounts() {
    return this.account();
  }

  async getAccounts() {
    return await this.account();
  }

  getNetwork() {
    return this.network();
  }

  switchNetwork(network) {
    if (!(network in BtcNetworks)) {
      throw Error(`cur network is: ${network},only support networl is :${BtcNetworks}`)
    }
    this._request("switchNetwork", { network: network })
  }

  signMessage(message, type = "ecdsa") {
    if (type !== "ecdsa" && type !== "bip322-simple") {
      throw Error("Invida params, only support type is: ecdsa | bip322-simple")
    }
    // todo 
    return this._request("signMessage", { data: message, type: type })
  }

  signPsbt(psbtHex) {
    this._request("signPsbt", { tx: psbtHex })
      .then((hex) => {
        this.printLog(hex)
        return JSON.parse(Utils.messageToBuffer(hex).toString());
      });
  }

  pushPsbt(psbtHex) {
    this._request("pushPsbt", { tx: psbtHex })
      .then((hex) => {
        this.printLog(hex)
        return JSON.parse(Utils.messageToBuffer(hex).toString());
      });
  }

  pushTx(signedTx) {
    this._request("submitTransaction", { tx: signedTx })
      .then((hex) => {
        this.printLog(hex)
        return JSON.parse(Utils.messageToBuffer(hex).toString());
      });
  }

  /**
   * @private Internal rpc handler
   */
  _request(method, payload) {
    if (this.isDebug) {
      console.log(
        `==> _request method: ${method}, payload ${JSON.stringify(payload)}`
      );
    }
    return new Promise((resolve, reject) => {
      const id = Utils.genId();
      console.log(`==> setting id ${id}`);
      this.callbacks.set(id, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });

      switch (method) {
        case "requestAccounts":
          return this.postMessage("requestAccounts", id, payload);
        case "switchNetwork":
          return this.postMessage("switchNetwork", id, payload)
        case "signMessage":
          return this.postMessage("signMessage", id, payload);
        case "submitTransaction":
          return this.postMessage("pushTx", id, payload);
        case "signPsbt":
          return this.postMessage("signPsbt", id, payload);
        case "pushPsbt":
          return this.postMessage("pushPsbt", id, payload);
        default:
          // throw errors for unsupported methods
          throw new ProviderRpcError(
            4200,
            `Trust does not support calling ${payload.method} yet.`
          );
      }
    });
  }
}

module.exports = TrustBtcWeb3Provider;
