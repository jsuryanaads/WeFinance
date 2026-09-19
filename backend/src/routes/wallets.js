const express=require('express');
const pool=require('../db');
const router=express.Router();
function normalize(row){return{id:row.id,userId:row.user_id,name:row.name,walletType:row.wallet_type,openingBalance:Number(row.opening_balance),isActive:row.is_active,createdAt:row.created_at,updatedAt:row.updated_at};}
router.get('/',async(req,res,next)=>{
  try{
    const result=await pool.query("SELECT w.*, COALESCE(SUM(CASE WHEN t.type='income' AND t.wallet_id=w.id THEN t.amount WHEN t.type='expense' AND t.wallet_id=w.id THEN -t.amount WHEN t.type='transfer' AND t.from_wallet_id=w.id THEN -t.amount WHEN t.type='transfer' AND t.to_wallet_id=w.id THEN t.amount ELSE 0 END),0) movement FROM wallets w LEFT JOIN transactions t ON t.user_id=w.user_id AND t.deleted_at IS NULL WHERE w.user_id=$1 GROUP BY w.id ORDER BY w.created_at ASC",[req.user.id]);
    res.json({data:result.rows.map(r=>({...normalize(r),balance:Number(r.opening_balance)+Number(r.movement)}))});
  }catch(error){next(error);}
});
router.post('/',async(req,res,next)=>{
  const name=String(req.body?.name||'').trim(),walletType=String(req.body?.walletType||'cash'),openingBalance=Number(req.body?.openingBalance||0);
  if(!name)return res.status(400).json({error:'name is required'});
  if(!Number.isFinite(openingBalance)||openingBalance<0)return res.status(400).json({error:'openingBalance cannot be negative'});
  if(!['cash','bank','ewallet','other'].includes(walletType))return res.status(400).json({error:'Invalid wallet type'});
  try{const result=await pool.query('INSERT INTO wallets(user_id,name,wallet_type,opening_balance) VALUES($1,$2,$3,$4) RETURNING *',[req.user.id,name,walletType,openingBalance]);res.status(201).json({data:normalize(result.rows[0])});}
  catch(error){if(error.code==='23505')return res.status(409).json({error:'Wallet name already exists'});next(error);}
});
module.exports=router;