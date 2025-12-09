const TX_TYPES = {
  withdraw:{id:'withdraw',label:'Withdrawal'},
  deposit:{id:'deposit',label:'Deposit'},
  balance:{id:'balance',label:'Balance Enquiry'},
  transfer:{id:'transfer',label:'Fund Transfer'},
  pin:{id:'pin',label:'PIN Change'}
};

const STORAGE_KEY='atm_tx_history_v1_with_balance';

let stack=[];
let nextId=1;
let balance=0;

function nowStr(){
  return new Date().toLocaleString();
}

function typeLabel(key){
  return TX_TYPES[key]?.label||'Unknown';
}

function formatAmount(a){
  return a>0?'₹'+(+a).toFixed(2):'';
}

function updateCount(){
  countLabel.textContent=stack.length+' transactions';
}

function updateBalanceDisplay(){
  balanceDisplay.textContent='₹'+balance.toFixed(2);
}

function renderHistory(limit=50){
  historyList.innerHTML='';
  const n=Math.min(limit,stack.length);
  if(stack.length===0){
    historyList.innerHTML='<div class="muted" style="padding:12px">No transactions yet.</div>';
    updateCount();updateBalanceDisplay();return;
  }
  for(let i=stack.length-1;i>=Math.max(0,stack.length-n);i--){
    const t=stack[i];
    const card=document.createElement('div');
    card.className='tx';
    const badge=document.createElement('div');
    badge.className='badge';
    badge.style.background=
      t.type==='deposit'?'linear-gradient(135deg,#c7ffd8,#7ef1c2)':
      t.type==='withdraw'?'linear-gradient(135deg,#ffd6c7,#ff9e8f)':
      t.type==='transfer'?'linear-gradient(135deg,#ffd6ff,#ffb3ff)':
      t.type==='balance'?'linear-gradient(135deg,#d3e3ff,#b0c9ff)':
      'linear-gradient(135deg,#e6f8ff,#bfeeff)';
    badge.textContent=t.type.toUpperCase();
    const body=document.createElement('div');
    body.style.flex='1';
    body.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:700">${typeLabel(t.type)}</div>
        <div class="amt">${formatAmount(t.amount)}</div>
      </div>
      <div class="muted" style="margin-top:6px;font-size:13px">ID: ${t.id} • ${t.timestamp}</div>
    `;
    card.appendChild(badge);
    card.appendChild(body);
    historyList.appendChild(card);
  }
  updateCount();
  updateBalanceDisplay();
}

function pushTransaction(tx){
  stack.push(tx);
  renderHistory(parseInt(showCount.value||5));
  persist();
}

function popTransaction(){
  if(stack.length===0)return null;
  const t=stack.pop();
  if(t.type==='deposit')balance-=t.amount;
  else if(t.type==='withdraw'||t.type==='transfer')balance+=t.amount;
  if(balance<0)balance=0;
  renderHistory(parseInt(showCount.value||5));
  persist();
  return t;
}

function persist(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify({stack,nextId,balance}));
}

function load(){
  const raw=localStorage.getItem(STORAGE_KEY);
  if(!raw)return false;
  const p=JSON.parse(raw);
  stack=p.stack||[];
  nextId=p.nextId||1;
  balance=p.balance||0;
  return true;
}

function clearStack(){
  stack=[];nextId=1;balance=0;
  persist();renderHistory();
}

txType.addEventListener('change',e=>{
  const type=e.target.value;
  amountBlock.style.display=
    (type==='withdraw'||type==='deposit'||type==='transfer')?'block':'none';
});

addBtn.addEventListener('click',()=>{
  const type=txType.value;
  const amountNum=+amount.value||0;

  if(type==='withdraw'||type==='transfer'){
    if(amountNum<=0){alert('Enter valid amount');return;}
    if(amountNum>balance){alert('Insufficient balance');return;}
    balance-=amountNum;
  } else if(type==='deposit'){
    if(amountNum<=0){alert('Enter valid amount');return;}
    balance+=amountNum;
  }

  const tx={
    id:nextId++,
    type,
    amount:type==='balance'?balance:amountNum,
    timestamp:nowStr()
  };

  pushTransaction(tx);
  amount.value='';
});

undoBtn.addEventListener('click',()=>{
  const t=popTransaction();
  if(!t){alert('No transaction to undo.');return;}
  alert('Undone: '+typeLabel(t.type)+' ₹'+(t.amount||0)+'\nNew Balance: ₹'+balance.toFixed(2));
});

clearBtn.addEventListener('click',()=>{
  if(confirm('Clear all?'))clearStack();
});

saveBtn.addEventListener('click',()=>{
  persist();alert('Saved.');
});

loadBtn.addEventListener('click',()=>{
  if(load()){renderHistory(parseInt(showCount.value||5));alert('Loaded.');}
  else alert('No saved data.');
});

showBtn.addEventListener('click',()=>{
  renderHistory(parseInt(showCount.value||5));
});

exportBtn.addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify({stack,nextId,balance},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='atm_history.json';document.body.appendChild(a);
  a.click();a.remove();URL.revokeObjectURL(url);
});

importBtn.addEventListener('click',()=>fileInput.click());

fileInput.addEventListener('change',async e=>{
  const f=e.target.files[0];
  if(!f)return;
  const txt=await f.text();
  const p=JSON.parse(txt);
  if(Array.isArray(p.stack)){
    stack=p.stack;nextId=p.nextId;balance=p.balance;
    persist();
    renderHistory(parseInt(showCount.value||5));
    alert('Imported.');
  } else alert('Invalid file.');
});

window.addEventListener('load',()=>{
  load();
  renderHistory(parseInt(showCount.value||5));
});
