const crypto=require('crypto');
const express=require('express');
const pool=require('../db');
const router=express.Router();
router.post('/sync',async(req,res,next)=>{
  const {wallets=[],categories=[],transactions=[]}=req.body||{};
  if(!Array.isArray(wallets)||!Array.isArray(categories)||!Array.isArray(transactions))return res.status(400).json({error:'Invalid sync payload'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('DELETE FROM transactions WHERE user_id=$1',[req.user.id]);
    await client.query('DELETE FROM wallets WHERE user_id=$1',[req.user.id]);
    await client.query('DELETE FROM categories WHERE user_id=$1',[req.user.id]);
    const walletMap=new Map();
    for(const w of wallets){const r=await client.query('INSERT INTO wallets(user_id,name,wallet_type,opening_balance,is_active) VALUES($1,$2,$3,$4,$5) RETURNING id,name',[req.user.id,String(w.name).trim(),w.type||w.walletType||'other',Number(w.openingBalance)||0,w.isActive??true]);walletMap.set(String(w.id||w.name),r.rows[0].id);walletMap.set(String(w.name),r.rows[0].id);}
    const categoryMap=new Map();
    for(const c of categories){const r=await client.query('INSERT INTO categories(user_id,name,type) VALUES($1,$2,$3) RETURNING id,name',[req.user.id,String(c.name).trim(),c.type||'expense']);categoryMap.set(String(c.id||c.name),r.rows[0].id);categoryMap.set(String(c.name),r.rows[0].id);}
    for(const t of transactions){const walletId=walletMap.get(String(t.walletId||t.wallet||t.walletName));if(!walletId)continue;const categoryId=t.type==='transfer'?null:categoryMap.get(String(t.categoryId||t.category));const to=t.type==='transfer'?walletMap.get(String(t.toWalletId||t.toWallet)):null;const groupId=t.type==='transfer'?crypto.randomUUID():null;await client.query('INSERT INTO transactions(user_id,wallet_id,category_id,type,amount,transaction_date,description,note,from_wallet_id,to_wallet_id,transfer_group_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[req.user.id,walletId,categoryId||null,t.type||'expense',Number(t.amount)||0,t.date||new Date().toISOString().slice(0,10),String(t.description||'Transaksi'),t.note||null,t.type==='transfer'?walletId:null,t.type==='transfer'?to:null,groupId]);}
    await client.query('COMMIT');res.json({ok:true});
  }catch(error){await client.query('ROLLBACK');next(error);}finally{client.release();}
});
module.exports=router;