// mongoose schema model
const Product = require('../../models/product.model');
const productCategory = require('../../models/products-category.model');
const Account = require('../../models/account.model');

// system config
const systemConfig = require('../../config/system');

// helper
const filterHelper = require('../../helper/filter.helper');
const searchObjectHelper = require('../../helper/search.helper');
const paginationObjectHelper = require('../../helper/pagination.helper');
const createTreeHelper = require('../../helper/createTree.helper');

// [GET] /admin/products
module.exports.index = async (req, res) => {
    const findObject = {
        deleted:false
    };

    try {
        // button filter status 
        const buttonFilterStatus = filterHelper.buttonStatus(req.query);
        if(req.query.status)
            findObject.status = req.query.status;

        // search keyword
        const searchObject = searchObjectHelper(req.query);
        if(req.query.keyword){
            findObject.title = searchObject.title;
        }

        // count document in database [extension: deleted, status, keyword]
        const numberOfRecords = await Product.countDocuments(findObject);

        // pagination
        const limitItem = 5;
        const paginationObject = paginationObjectHelper(req.query, limitItem, numberOfRecords);

        // to Database
        const records = await Product.find(findObject)
                                     .sort({position: 'asc'})
                                     .limit(paginationObject.limit)
                                     .skip(paginationObject.skip);

        // get full-name users of records
        for(let record of records){
            const createdUser = await Account.findOne({
                _id: record.createdBy.account_id,
            });

            if(createdUser){
                const creator = createdUser.fullName;
                record.creator = creator;
            }

            // get length of field updateBy (GET LAST USER UPDATED)
            const sizeOfUpdatedBy =  record.updatedBy.length;

            if(sizeOfUpdatedBy > 0){
                const updatedUser = await Account.findOne({
                    _id: record.updatedBy[sizeOfUpdatedBy-1].account_id
                });

                if(updatedUser){
                    record.updater = updatedUser.fullName;
                    record.actionOfUpdater = record.updatedBy[sizeOfUpdatedBy-1].action;
                }
            }
            else{
                record.updater = record.creator;
                record.actionOfUpdater = "Tạo sản phẩm"
            }
        }

        // views
        res.render('admin/pages/products/index', {
            title: "Products",
            numberOfRecords: numberOfRecords,
            records: records,
            buttonFilterStatus: buttonFilterStatus,
            keyword: searchObject.keyword,
            pagination: paginationObject
        });
    } 
    catch (error) {
        res.redirect('back');
    }
    
}

// [PATCH] /admin/products/change-status/:id/:status
module.exports.changeStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const status = req.params.status;
        
        // to Database
        await Product.updateOne(
            {_id: id},
            {status: status}
        );  
        req.flash('success', 'Change the status of the product successfully');
        res.redirect('back');
       
        
    } 
    catch (error) {
        res.redirect('back');
    }
}

// [PATCH] /admin/products/change-multi
module.exports.changeMulti = async (req, res) => {
    try{
        const type = req.body.type;
        const ids = req.body.ids.split(", ");
        const numberOfProduucts = ids.length;

        // to Database
        switch(type){
            case "active":
                await Product.updateMany(
                    {_id: {$in: ids}},
                    {status: "active"}
                )
                req.flash('success', `Change the status of ${numberOfProduucts} product to Active successfully`);
                break;

            case "inactive":
                await Product.updateMany(
                    {_id: {$in: ids}},
                    {status: "inactive"}
                )
                req.flash('success', `Change the status of ${numberOfProduucts} product to Inactive successfully`);
                break;

            case "delete":
                await Product.updateMany(
                    {_id: {$in: ids}},
                    {
                        deleted: true,
                        deletedAt: new Date()
                    }
                )
                req.flash('success', `Delete ${numberOfProduucts} product successfully`);
                break;
            
            case "position":
                for(item of ids){
                    const [id, position] = item.split("-");
                    
                    await Product.updateOne(
                        {_id: id},
                        {position: position}
                    )
                }
                req.flash('success', `Change the position of ${numberOfProduucts} product successfully`);
                break;
            default:
                break;
        }
        res.redirect('back');
    }
    catch(error){
        req.flash('success', `Change multi of ${numberOfProduucts} product successfully`);
    }
}

// [DELETE] /admin/products/delete-soft/:id
module.exports.deleteSoft = async (req, res) => {
    try{
        const id = req.params.id;
        const deletedBy = {
            account_id: res.locals.user.id,
            deletedAt: new Date()
        }

        await Product.updateOne(
            {_id: id},
            {
                deletedBy: deletedBy,
                status: "inactive",
                deleted: true
                // deletedAt: new Date()
            }
        );
        req.flash('success', `Delete product successfully`);
        res.redirect('back');
    }
    catch(error){
        req.flash('error', 'Delete product fail');
        res.redirect('back');
    }
}

// [GET] /admin/products/create
module.exports.createView = async (req, res) => {
    try {
        // create tree category
        const data = await productCategory.find({deleted:false});
        const categoryList = createTreeHelper(data);

        res.render('admin/pages/products/create', {
            title: "Create Doccument",
            categoryList: categoryList
        })    
    } 
    catch (error) {
        req.flash('error', 'Go to create product fail');
        res.redirect('back');
    }
}

// [POST] /admin/products/create
module.exports.createProduct = async(req, res) => {
    try{
        const findObject = {
            deleted: false
        }

        // count document 
        const numberOfRecord = await Product.countDocuments(findObject);

        // convert string to int
        req.body.price = parseInt(req.body.price);
        req.body.discountPercentage = parseInt(req.body.discountPercentage);
        req.body.stock = parseInt(req.body.stock);

        if(req.body.position === ""){
            req.body.position = numberOfRecord + 1;
        }
        else{
            req.body.position = parseInt(req.body.position);
        }

        /**use it when u save image on locals */
        // if(req.file){
        //     req.body.thumbnail = `/uploads/${req.file.filename}`;
        // }

        // get user id create
        req.body.createdBy = {
            account_id: res.locals.user.id
        } 

        // save on Database
        const record = new Product(req.body);
        await record.save();
        
        req.flash('success', 'Created new product successfully');
        res.redirect(systemConfig.path_admin + `/products`);
    }
    catch(error){
        console.log(error);
        req.flash('error', 'Created new product fail');
        res.redirect('back');
    }
}

// [GET] /admin/products/edit/:id
module.exports.editView = async (req, res) => {
    try{
        const findObject = {
            _id: req.params.id, 
            // deleted: false
        }
        const id = req.params.id;

        // create tree category
        const data = await productCategory.find({deleted:false});
        const categoryList = createTreeHelper(data);

        const record = await Product.findOne(findObject);

        res.render("admin/pages/products/edit",{
            title: "Edit Product",
            record: record,
            categoryList: categoryList
        })
    }
    catch(error){
        req.flash('error', 'Go to edit product page fail');
        res.redirect('back')
    }
}

// [PATCH] /admin/products/edit/:id
module.exports.editProduct = async (req, res) => {
    try{
        const id = req.params.id;

        // convert string to int
        req.body.price = parseInt(req.body.price);
        req.body.discountPercentage = parseInt(req.body.discountPercentage);
        req.body.stock = parseInt(req.body.stock);
        req.body.position = parseInt(req.body.position);

        // if(req.file){
        //     req.body.thumbnail = `/uploads/${req.file.filename}`;
        // }

        await Product.updateOne(
            {_id: id},
            req.body
        )
        req.flash('success', 'Editd product successfully');
        res.redirect(systemConfig.path_admin + `/products`);
    }
    catch(error){
        req.flash('error', 'Edit product fail');
        res.redirect('back')
    }
}

// [GET] /admin/products/detail/:id
module.exports.detail = async (req, res) => {
    try{
        const findObject = {
            _id: req.params.id, 
            deleted: false
        }

        const record = await Product.findOne(findObject);

        res.render('admin/pages/products/detail', {
            title: "Detail product",
            record: record
        });
    }
    catch(error){

    }
}

// [GET] /admin/products/trash
module.exports.trash = async (req, res) => {
    try{
        const findObject = {
            deleted: true
        }

        // count document
        const numberOfRecords = await Product.countDocuments(findObject);

        const paginationObject = paginationObjectHelper(req.query, 5, numberOfRecords);

        // get document
        const records = await Product.find(findObject)
                                     .limit(paginationObject.limit)
                                     .skip(paginationObject.skip);

        // get full-name users of records
        for(let record of records){
            const deletedUser = await Account.findOne({
                _id: record.deletedBy.account_id
            });

            if(deletedUser){
                const deletor = deletedUser.fullName;
                record.deletor = deletor;
            }
        }

        // views
        res.render('admin/pages/products/trash', {
            title: "Sản phẩm đã xóa",
            records: records,
            numberOfRecords: numberOfRecords,
            pagination: paginationObject
        });
    }
    catch(error){

    }
}

// [DELETE] /admin/products/restore/:id
module.exports.restore = async (req, res) => {
    try{
        await Product.updateOne(
            {
                _id: req.params.id
            },
            {
                deleted: false,
                $push: {
                    updatedBy: {
                        account_id: res.locals.user.id,
                        action: "Khôi phục sản phẩm đã xóa",
                        updatedAt: new Date()
                    }
                }
            }
        );
        req.flash('success', 'Khôi phục sản phẩm thành công');
        res.redirect('back');
    }
    catch(error){

    }
}

// [DELETE] /admin/products/delete-hard/:id
module.exports.deleteHard = async (req, res) => {
    try{
        await Product.deleteOne({
            _id: req.params.id
        });
        req.flash('success', 'Đã xóa vĩnh viễn sản phẩm này');
        res.redirect('back');
    }
    catch(error){

    }
}