const express=require('express');
const pool=require('../db');
const router=express.Router();

router.get('/bootstrap',async(req,res,next)=>{
  try{
    const [wallets,categories,transactions]=await Promise.all([
      pool.query('SELECT id,name,wallet_type,opening_balance,is_active,created_at,updated_at FROM wallets WHERE user_id=$1 ORDER BY created_at',[req.user.id]),
      pool.query('SELECT id,name,type,is_system,created_at,updated_at FROM categories WHERE is_system=true OR user_id=$1 ORDER BY is_system DESC,name',[req.user.id]),
      pool.query(`SELECT t.id,t.wallet_id,t.category_id,c.name AS category_name,t.type,t.amount,t.transaction_date,t.description,t.note,t.debt_id,t.bill_id,t.goal_id,t.created_at,t.updated_at,t.from_wallet_id,t.to_wallet_id,t.transfer_group_id FROM transactions t LEFT JOIN categories c ON c.id=t.category_id WHERE t.user_id=$1 AND t.deleted_at IS NULL ORDER BY t.transaction_date DESC,t.created_at DESC`,[req.user.id])
    ]);
    res.json({data:{wallets:wallets.rows,categories:categories.rows,transactions:transactions.rows}});
  }catch(error){next(error);}
});

router.post('/import',async(req,res,next)=>{
  const {wallets=[],categories=[],transactions=[]}=req.body||{};
  if(!Array.isArray(wallets)||!Array.isArray(categories)||!Array.isArray(transactions))return res.status(400).json({error:'Invalid migration payload'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const walletMap=new Map();
    for(const w of wallets){
      const result=await client.query(
        `INSERT INTO wallets(user_id,name,wallet_type,opening_balance,is_active) VALUES($1,$2,$3,$4,$5)
         ON CONFLICT(user_id,name) DO UPDATE SET wallet_type=EXCLUDED.wallet_type,opening_balance=EXCLUDED.opening_balance,is_active=EXCLUDED.is_active
         RETURNING id,name`,
        [req.user.id,String(w.name).trim(),w.type||w.walletType||'other',Number(w.openingBalance??w.opening_balance??0),w.isActive??true]);
      walletMap.set(String(w.id||w.name),result.rows[0].id);
    }
    const categoryMap=new Map();
    for(const c of categories){
      const result=await client.query(
        `INSERT INTO categories(user_id,name,type) VALUES($1,$2,$3)
         ON CONFLICT(user_id,name,type) DO UPDATE SET name=EXCLUDED.name
         RETURNING id,name`,
        [req.user.id,String(c.name).trim(),c.type||'expense']);
      categoryMap.set(String(c.id||c.name),result.rows[0].id);
    }
    let imported=0;
    for(const t of transactions){
      const walletId=walletMap.get(String(t.walletId||t.wallet||t.walletName));
      if(!walletId)continue;
      const categoryId=t.categoryId?categoryMap.get(String(t.categoryId)):null;
      const result=await client.query(
        `INSERT INTO transactions(user_id,wallet_id,category_id,type,amount,transaction_date,description,note)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [req.user.id,walletId,categoryId||null,t.type||'expense',Number(t.amount)||0,t.date||new Date().toISOString().slice(0,10),String(t.description||'Transaksi'),t.note||null]);
      if((t.type||'')==='transfer'&&t.toWallet){
        const toWalletId=walletMap.get(String(t.toWalletId||t.toWallet));
        if(toWalletId)await client.query('UPDATE transactions SET from_wallet_id=$1,to_wallet_id=$2,transfer_group_id=$3 WHERE id=$4',[walletId,toWalletId,require('crypto').randomUUID(),result.rows[0].id]);
      }
      imported++;
    }
    await client.query('COMMIT');
    res.status(201).json({data:{imported}});
  }catch(error){await client.query('ROLLBACK');next(error);}finally{client.release();}
});
module.exports=router;