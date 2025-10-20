let db;
const tabela = "participantes";

initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`
}).then(SQL => {
    loadLocalStorage(SQL);
});

function loadLocalStorage(SQL) {
    const base64 = localStorage.getItem(tabela);

    if (base64) {
        const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        db = new SQL.Database(binary);
    } else {
        db = new SQL.Database();
        db.run("CREATE TABLE IF NOT EXISTS " +  tabela + "(id INTEGER PRIMARY KEY, cpf TEXT, nome TEXT, entrada TEXT, saida TEXT);");
    }
    renderPresentes();
}

function insertLocalStorage(obj) {
    const agora = new Date();
    const hora =  String(agora.getHours()).padStart(2, '0') + ":" + String(agora.getMinutes()).padStart(2, '0');

    const result = db.exec("SELECT * FROM " +  tabela + " WHERE cpf = '" + obj.cpf + "'");
    if (result.length == 0) {
        db.run("INSERT INTO  " +  tabela + "(cpf,nome,entrada) VALUES (?, ?, ?)", [obj.cpf, obj.nome, hora]);
    } else {
        db.run("UPDATE " +  tabela + " SET saida = '" + hora + "' WHERE cpf = '" + obj.cpf + "'");
    }

    saveLocalStorage();
    renderPresentes();
}

function saveLocalStorage() {
    const data = db.export();
    const base64 = btoa(String.fromCharCode(...data));
    localStorage.setItem(tabela, base64);
}

function renderPresentes() {
    presentes = [];
    const result = db.exec("SELECT * FROM " +  tabela + " ORDER BY saida DESC, entrada DESC");
    saveLocalStorage();
    
    //limpa dados de presença
    $('#presenca').DataTable().clear().draw();
    $('#presenca').DataTable().destroy();

    if (result.length > 0) {
       // Percorre a lista de presentes de LocalStorage
        for(let i = 0; i < result[0].values.length; i++) {
            const id = result[0].values[i][0];
            const cpf = result[0].values[i][1];
            const nome = result[0].values[i][2];
            const entrada = result[0].values[i][3];
            const saida = result[0].values[i][4];

            presentes.push({"id": id, "cpf": cpf, "nome": nome, "entrada": entrada, "saida": saida});
        }
    }

    $('#presenca').DataTable({
        data: presentes,
        columns: [
            { data: 'nome' },
            { data: 'entrada' }
        ],
        order: [[1,'desc']]
    });
}

function exportDB() {
    if(presentes.length > 0 ) {
        const data = db.export();
        const blob = new Blob([data], { type: 'application/octet-stream' });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = tabela + '.sqlite';
        a.click();
    }
}

function importDB() {
    const file = tabela + '.sqlite';
    const reader = new FileReader();

    reader.onload = function() {
        console.log('onload');

        const uInt8Array = new Uint8Array(reader.result);
        console.log('uInt8Array',uInt8Array);

        db = new SQL.Database(uInt8Array);
        console.log('db',db);

        saveLocalStorage();
        renderPresentes();
    };
    reader.readAsArrayBuffer(file);
}