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
  segnet: "segnet",
}

class TrustBtcWeb3Provider extends BaseProvider {
  constructor(config) {
    super(config);
    this.providerNetwork = "bitcoin";
    this.callbacks = new Map();
    this._isConnected = false;

    try {
      this._network = "" + config.bitcoin.network;
    } catch (error) {
      console.log(error);
    }
    if (!Object.values(BtcNetworks).includes(this._network)) {
      this._network = BtcNetworks.mainnet;
    }
  }

  setAddress(address) {
    this.address = address;
    this.ready = !!address;
    this._isConnected = true;
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
      this.printLog(data);
      this.emitAccountChanged(data);
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
    if (!Object.values(BtcNetworks).includes(network)) {
      throw Error(`cur network is: ${network},only support networks are :${Object.keys(BtcNetworks).join(', ')}}`)
    }
    return this._request("switchNetwork", { network: network }).then((response) => {
      this.printLog(response);
      this._network = response;
      this.emitNetworkChanged(response);
      return response;
    });
  }

  signMessage(message, type = "ecdsa") {
    if (type !== "ecdsa" && type !== "bip322-simple") {
      throw Error("Invalid params, only support type is: ecdsa | bip322-simple")
    }
    return this._request("signMessage", { data: message, type: type }).then((response) => {
      return response;
    });
  }

  signPsbt(psbtHex) {
    return this._request("signPsbt", { data: psbtHex }).then((response) => {
      this.printLog(response);
      return response;
    });
  }

  pushPsbt(psbtHex) {
    return this._request("pushPsbt", { data: psbtHex })
      .then((response) => {
        this.printLog(response);
        return response
      });
  }

  pushTx(signedTx) {
    return this._request("submitTransaction", { data: signedTx })
      .then((response) => {
        this.printLog(response);
        return response;
      });
  }

  emitAccountChanged(data) {
    this.emit("accountsChanged", data);
  }

  emitNetworkChanged(network) {
    this.emit("networkChanged", network);
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
