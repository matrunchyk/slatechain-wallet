import AbstractModel from './AbstractModel';
import { IBlockchainProps } from '../../index';
import State from './State';
import Block from './Block';
import Transaction from './Transaction';

export default class Blockchain extends AbstractModel {
  public blocks: Block[] = [];
  public state: State = new State({});

  constructor() {
    super();
    this.read();
  }

  get props(): string[] {
    return ['state', 'blocks'];
  }

  //noinspection JSMethodCanBeStatic
  get defaults(): IBlockchainProps {
    return {
      blocks: [],
      state: new State({}),
    };
  }

  get prevBlock() {
    return this.blocks[this.blocks.length - 1] || null;
  }

  update(data: string | object) {
    const chain = super.update(data);

    chain.blocks = chain.blocks.map((block: Block) => Block.fromJSON(block));
    chain.state = State.fromJSON(chain.state);
    return chain;
  }

  static verifyTransaction(prev: Transaction, state: State, tx: Transaction) {
    const sender = state.wallets[tx.from] || { amount: 0 };

    if (tx.amount <= 0 || sender.amount < tx.amount) {
      throw Error('Bad amount.');
    }

    if (tx.nonce <  0 || sender.nonce > tx.nonce) {
      throw Error('Bad nonce.');
    }

    if (prev && prev.nonce > tx.nonce) {
      throw Error('Bad nonce order.');
    }

    if (!tx.verify()) {
      throw Error('Transaction is not signed properly.');
    }

    return state.with(tx);
  }

  static verifyBlock(prev: Block, state: State, block: Block) {
    if (prev && block.parentHash !== prev.hash()) {
      throw Error('Bad parentHash.');
    }

    if (prev && block.stateHash  !== state.hash()) {
      throw Error('Bad stateHash.' );
    }

    if (!block.verify()) {
      throw Error('Block is not mined properly.');
    }

    return block.transactions.reduce((state, tx, index) => {
      const prev = block.transactions[index - 1] || (null);

      return Blockchain.verifyTransaction(prev, state, tx);
    }, state.with(block));
  }

  balance(address: string) {
    if (!this.state.wallets[address]) {
      return 0;
    }

    return this.state.wallets[address].amount;
  }

  push(block: Block) {
    this.state = Blockchain.verifyBlock(this.prevBlock, this.state, block);
    this.blocks.push(block);
    this.write();
  }
}
