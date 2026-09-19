const crypto = require('crypto');
const express = require('express');
const pool = require('../db');
const router = express.Router();

function normalizeTransaction(row) {
  return {id:row.id,userId:row.user_id,walletId:row.wallet_id,categoryId:row.category_id,type:row.type,amount:Number(row.amount),date:row.transaction_date,description:row.description,note:row.note,debtId:row.debt_id,billId:row.bill_id,goalId:row.goal_id,fromWalletId:row.from_wallet_id||null,toWalletId:row.to_wallet_id||null,transferGroupId:row.transfer_group_id||null,createdAt:row.created_at,updatedAt:row.updated_at};
}

router.get('/', async (req,res,next)=>{
  try{
    const limit=Math.min(Math.max(Number(req.query.limit)||50,1),200);
    const result=await pool.query(`SELECT id,user_id,wallet_id,category_id,type,amount,transaction_date,description,note,debt_id,bill_id,goal_id,from_wallet_id,to_wallet_id,transfer_group_id,created_at,updated_at
      FROM transactions WHERE user_id=$1 AND deleted_at IS NULL ORDER BY transaction_date DESC,created_at DESC LIMIT $2`,[req.user.id,limit]);
    res.json({data:result.rows.map(normalizeTransaction)});
  }catch(error){next(error);}
});

router.get('/:id',async(req,res,next)=>{
  try{
    const result=await pool.query(`SELECT id,user_id,wallet_id,category_id,type,amount,transaction_date,description,note,debt_id,bill_id,goal_id,created_at,updated_at
      FROM transactions WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL`,[req.params.id,req.user.id]);
    if(!result.rowCount)return res.status(404).json({error:'Transaction not found'});
    res.json({data:normalizeTransaction(result.rows[0])});
  }catch(error){next(error);}
});

router.post('/',async(req,res,next)=>{
  const {walletId,categoryId,type,amount,date,description,note,debtId,billId,goalId,fromWalletId,toWalletId}=req.body||{};
  const numericAmount=Number(amount);
  if(!walletId||!type||!numericAmount||!date||!String(description||'').trim())return res.status(400).json({error:'walletId, type, amount, date, and description are required'});
  if(!['income','expense','transfer'].includes(type)||numericAmount<=0)return res.status(400).json({error:'Invalid transaction type or amount'});
  if(type==='transfer'&&(!fromWalletId||!toWalletId||fromWalletId===toWalletId))return res.status(400).json({error:'Transfer requires different fromWalletId and toWalletId'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const walletCheck=type==='transfer'
      ? await client.query('SELECT id FROM wallets WHERE id=ANY($1::uuid[]) AND user_id=$2 AND is_active=true',[ [fromWalletId,toWalletId],req.user.id])
      : await client.query('SELECT id FROM wallets WHERE id=$1 AND user_id=$2 AND is_active=true',[walletId,req.user.id]);
    if(walletCheck.rowCount!==(type==='transfer'?2:1))throw Object.assign(new Error('Wallet not found'),{status:400});
    if(categoryId){const c=await client.query('SELECT id FROM categories WHERE id=$1 AND (user_id=$2 OR is_system=true)',[categoryId,req.user.id]);if(!c.rowCount)throw Object.assign(new Error('Category not found'),{status:400});}
    for(const [id,label] of [[debtId,'Debt'],[billId,'Bill'],[goalId,'Goal']]){
      if(id){const table=label.toLowerCase()+'s';const r=await client.query(`SELECT id FROM ${table} WHERE id=$1 AND user_id=$2`,[id,req.user.id]);if(!r.rowCount)throw Object.assign(new Error(label+' not found'),{status:400});}
    }
    const result=await client.query(`INSERT INTO transactions(user_id,wallet_id,category_id,type,amount,transaction_date,description,note,debt_id,bill_id,goal_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id,user_id,wallet_id,category_id,type,amount,transaction_date,description,note,debt_id,bill_id,goal_id,created_at,updated_at`,
      [req.user.id,type==='transfer'?fromWalletId:walletId,categoryId||null,type,numericAmount,date,String(description).trim(),note||null,debtId||null,billId||null,goalId||null]);
    if(type==='transfer')await client.query('UPDATE transactions SET from_wallet_id=$1,to_wallet_id=$2,transfer_group_id=$3 WHERE id=$4',[fromWalletId,toWalletId,crypto.randomUUID(),result.rows[0].id]);
    await client.query('COMMIT');
    res.status(201).json({data:normalizeTransaction(result.rows[0])});
  }catch(error){await client.query('ROLLBACK');if(error.status)return res.status(error.status).json({error:error.message});next(error);}
  finally{client.release();}
});
module.exports=router;