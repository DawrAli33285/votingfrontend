const {registerContestant,login,getContestantData,ContestantData,resetCode,vote}=require('../controller/contestant')
const upload=require('../middlewares/image')
const router=require('express').Router();

router.post('/registerContestant',upload.single('video'),registerContestant)
router.post('/login',login)
router.patch('/resetCode',resetCode)
router.post('/vote',vote)
router.get('/getContestantData',getContestantData)
router.post('/ContestantData',ContestantData)
module.exports=router;