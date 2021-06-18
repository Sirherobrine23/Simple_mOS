const { readFileSync } = require("fs");
const { resolve } = require("path");
const { exit } = require("process");

// Product
const MacOS_Products = JSON.parse(readFileSync(resolve(__dirname, "./FetchOS/products.json"), "utf8"))

const SELF_DIR = resolve();

RECENT_MAC = 'Mac-7BA5B2D9E42DDD94'
MLB_ZERO = '00000000000000000'
MLB_VALID = 'C02749200YGJ803AX'
MLB_PRODUCT = '00000000000J80300'

TYPE_SID = 16
TYPE_K = 64
TYPE_FG = 64

INFO_PRODUCT = 'AP'
INFO_IMAGE_LINK = 'AU'
INFO_IMAGE_HASH = 'AH'
INFO_IMAGE_SESS = 'AT'
INFO_SIGN_LINK = 'CU'
INFO_SIGN_HASH = 'CH'
INFO_SIGN_SESS = 'CT'
INFO_REQURED = [INFO_PRODUCT, INFO_IMAGE_LINK, INFO_IMAGE_HASH, INFO_IMAGE_SESS, INFO_SIGN_LINK, INFO_SIGN_HASH, INFO_SIGN_SESS]

const None = null
const False = false
const True = true

function generate_id(itype, nid=None){
    valid_chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F']
    const random = Math.floor(Math.random() * valid_chars.length);
    if (nid === None) return (valid_chars[random])
    return nid
}

function product_mlb(mlb){
    return '00000000000' + mlb[11] + mlb[12] + mlb[13] + mlb[14] + '00'
}

function mlb_from_eeee(eeee){
    if (len(eeee) != 4){
        print('ERROR: Invalid EEEE code length!')
        process.exit(1)
    }
    return '00000000000' + eeee + '00'
}

function run_query(url, headers, post=None, raw=False){
    const FetchSync = require("sync-fetch");
    if (post !== None){} else data = None

    const FetchOptions = {
        headers: headers
    }
    const Response = FetchSync(url, FetchOptions)
    response = Response
    if (raw) return response;
    else {
        returnArray = {};
        Response.headers.forEach((v, k)=>{returnArray[k] = v})
        return returnArray
    }
}

function get_session(args){
    headers = {
        'Host': 'osrecovery.apple.com',
        'Connection': 'close',
        'User-Agent': 'InternetRecovery/1.0',
    }

    output = run_query('http://osrecovery.apple.com/', headers)
    console.log(output);
    if (output["set-cookie"]) {
        cookies = output["set-cookie"].split("; ")
        for (let cookie of cookies){
            if (cookie.startsWith("session=")) return cookie
        }
    }
    console.log("No get session, headers" + JSON.stringify(output, null, 4));
    exit(2)
}

function get_image_info(session, bid, mlb=MLB_ZERO, diag=False, os_type='default', cid=None){
    headers = {
        'Host': 'osrecovery.apple.com',
        'Connection': 'close',
        'User-Agent': 'InternetRecovery/1.0',
        'Cookie': session,
        'Content-Type': 'text/plain',
    }

    post = {
        'cid': generate_id(TYPE_SID, cid),
        'sn': mlb,
        'bid': bid,
        'k': generate_id(TYPE_K),
        'fg': generate_id(TYPE_FG)
    }

    if (diag) url = 'http://osrecovery.apple.com/InstallationPayload/Diagnostics'
    else {
        url = 'http://osrecovery.apple.com/InstallationPayload/RecoveryImage'
        post['os'] = os_type
    }

    output = run_query(url, headers, post)
}

function save_image(url, sess, filename='', directory=''){
    purl = url
    headers = {
        'Host': purl.hostname,
        'Connection': 'close',
        'User-Agent': 'InternetRecovery/1.0',
        'Cookie': '='.join(['AssetToken', sess])
    }

    if (filename == '') filename = os.path.basename(purl.path)
    if (filename.find('/') >= 0 || filename == '') console.log("File name error " + filename);
    console.log('Saving ' + url + ' to ' + filename + '...')
}

function action_download(args){
    _nuall = `Reference information for queries:
Recovery latest:
cid=3076CE439155BA14
sn=...
bid=Mac-E43C1C25D4880AD6
k=4BE523BB136EB12B1758C70DB43BDD485EBCB6A457854245F9E9FF0587FB790C
os=latest
fg=B2E6AA07DB9088BE5BDB38DB2EA824FDDFB6C3AC5272203B32D89F9D8E3528DC
Recovery default:
cid=4A35CB95FF396EE7
sn=...
bid=Mac-E43C1C25D4880AD6
k=0A385E6FFC3DDD990A8A1F4EC8B98C92CA5E19C9FF1DD26508C54936D8523121
os=default
fg=B2E6AA07DB9088BE5BDB38DB2EA824FDDFB6C3AC5272203B32D89F9D8E3528DC
Diagnostics:
cid=050C59B51497CEC8
sn=...
bid=Mac-E43C1C25D4880AD6
k=37D42A8282FE04A12A7D946304F403E56A2155B9622B385F3EB959A2FBAB8C93
fg=B2E6AA07DB9088BE5BDB38DB2EA824FDDFB6C3AC5272203B32D89F9D8E3528DC`
    session = get_session(args)
    info = get_image_info(session, bid=args.board_id, mlb=args.mlb, diag=args.diagnostics, os_type="")
}

module.exports = {
    Download: function(){},
    generate_id,
    run_query,
    get_session,
    get_image_info,
    action_download
}