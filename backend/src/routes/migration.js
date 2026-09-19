const express=require('express');
const pool=require('../db');
const router=express.Router();
router.get('/bootstrap',async(req,res,next)=>{
  try{
    const [wallets,categories,transactions]=await Promise.all([
      pool.query('SELECT id,name,wallet_type,opening_balance,is_active,created_at,updated_at FROM wallets WHERE user_id=$1 ORDER BY created_at',[req.user.id]),
      pool.query('SELECT id,user_id,name,type,created_at,updated_at FROM categories WHERE user_id IS NULL OR user_id=$1 ORDER BY (user_id IS NULL) DESC,name',[req.user.id]),
      pool.query('SELECT t.id,t.wallet_id,t.category_id,c.name AS category_name,t.type,t.amount,t.transaction_date,t.description,t.note,t.debt_id,t.bill_id,t.goal_id,t.created_at,t.updated_at,t.from_wallet_id,t.to_wallet_id,t.transfer_group_id FROM transactions t LEFT JOIN categories c ON c.id=t.category_id WHERE t.user_id=$1 AND t.deleted_at IS NULL ORDER BY t.transaction_date DESC,t.created_at DESC',[req.user.id])
    ]);
    res.json({data:{wallets:wallets.rows,categories:categories.rows,transactions:transactions.rows}});
  }catch(error){next(error);}
});
module.exports=router;