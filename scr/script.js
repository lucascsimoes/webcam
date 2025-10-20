const myAudioContext = new AudioContext();
function beep(duration, frequency, volume) {
    return new Promise((resolve, reject) => {
        duration = duration || 200;
        frequency = frequency || 440;
        volume = volume || 100;

        try {
            let oscillatorNode = myAudioContext.createOscillator();
            let gainNode = myAudioContext.createGain();
            oscillatorNode.connect(gainNode);

            oscillatorNode.frequency.value = frequency;
            oscillatorNode.type = "square";
            gainNode.connect(myAudioContext.destination);

            gainNode.gain.value = volume * 0.01;

            oscillatorNode.start(myAudioContext.currentTime);
            oscillatorNode.stop(myAudioContext.currentTime + duration * 0.001);

            oscillatorNode.onended = () => {
                resolve();
            };
        } catch (error) {
            reject(error);
        }
    });
}

function formatCPF(input) {
    let value = input.value.replace(/\D/g, ""); // Remove non-numeric characters
    value = value.replace(/(\d{3})(\d)/, "$1.$2"); // Add first dot
    value = value.replace(/(\d{3})(\d)/, "$1.$2"); // Add second dot
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2"); // Add dash
    input.value = value;
}

function fileExists(url) {
    var http = new XMLHttpRequest();
    http.open('HEAD', url, false);
    http.send();
    return http.status != 404;
}

let arquivo = "";
let inscritos = [];
let presentes = [];

window.addEventListener("DOMContentLoaded", function() {
    const inputTurma = document.getElementById("inputTurma");
    const inputNome = document.getElementById("inputNome");
    const inputData = document.getElementById("inputData");
    const inputInicio = document.getElementById("inputInicio");
    const inputTermino = document.getElementById("inputTermino");
    const inputCPF = document.getElementById("inputCPF");

    const buttonProximo = document.getElementById("buttonProximo");
    const buttonVoltar = document.getElementById("buttonVoltar");
    const buttonEntrar = document.getElementById("buttonEntrar");
    const buttonCarregar = document.getElementById("buttonCarregar");
    const buttonLimpar = document.getElementById("buttonLimpar");
    const buttonEncerrar = document.getElementById("buttonEncerrar");

    const divAlerta = document.getElementById("divAlerta");
    

    let ultimaEntrada;


    function Alertar(msg, ok) {1
        divAlerta.innerHTML = msg;
        divAlerta.classList.remove("alert-success");
        divAlerta.classList.remove("alert-danger");

        if(msg != "") {
            if(ok) {
                divAlerta.classList.add("alert-success");
            } else {
                divAlerta.classList.add("alert-danger");
            }
        }
    }

    function LerInscritos() {
        inscritos = [];

        Alertar("");

        try {
            const xhttp = new XMLHttpRequest();
            xhttp.open("GET", inputTurma.value + ".xml", false);
            xhttp.send();

            // Obtém a lista de inscritos
            const xmlDoc = xhttp.responseXML;
            const rows = xmlDoc.getElementsByTagName("ROW");

            // Percorre a lista de inscritos
            for (let i = 0; i < rows.length; i++) {
                const cpf  = rows[i].getElementsByTagName("CPF")[0].innerHTML;
                const nome = rows[i].getElementsByTagName("NOME")[0].innerHTML;

                inscritos.push({"cpf": cpf, "nome": nome});
            }
        }
        catch(e) {
            Alertar("INSCRITOS NÃO CARREGADOS", false);
        }
    }

    function LerEntrada() {
        renderPresentes();
    }

    function PesquisarCPF() {
        const result = inscritos.find(participante => participante.cpf == inputCPF.value);

        if(result != undefined) {
            Alertar(result.nome,true);

            insertLocalStorage(result);
        } else {
            Alertar("ENTRADA PROIBIDA",false);
        }
        beep(200, 440, 100);

        inputCPF.focus();
        inputCPF.select();
    }


    inputTurma.addEventListener("keydown", function() {
        this.value = this.value.toUpperCase();
    });

    inputNome.addEventListener("keydown", function() {
        this.value = this.value.toUpperCase();
    });

    inputCPF.addEventListener("keydown", function(e) {
        if (e.code.includes('Enter')) {
            buttonEntrar.click();
        }
    });


    buttonProximo.addEventListener("click", function() {
        if(inputTurma.value != '' && inputNome.value != '' && inputData.value != '' && inputInicio.value != '' && inputTermino.value != '' ) {

            arquivo = inputTurma.value + "_" + inputData.value.replaceAll("-", "") + inputInicio.value.replaceAll(":", "") + ".xml";

            LerInscritos();
            LerEntrada();
            ultimaEntrada = "";
            inputCPF.value = "";

            document.getElementById("pagina1").style.display="none";
            document.getElementById("pagina2").style.display="block";
            startScan();
            
            inputCPF.focus();
            inputCPF.select();
        }
    });

    buttonVoltar.addEventListener("click", function() {
        $('#presenca').DataTable().clear().draw();
        $('#presenca').DataTable().destroy();
        stopScan();

        document.getElementById("pagina1").style.display="block";
        document.getElementById("pagina2").style.display="none";

        buttonProximo.focus();
    });

    buttonEntrar.addEventListener("click", function() {
        Alertar("");
        if(inputCPF.value != "") {
            ultimaEntrada = inputCPF.value;
            PesquisarCPF(); 
        }
    });

    // buttonCarregar.addEventListener("click", function() {
    //     importDB();
    // });

    // buttonLimpar.addEventListener("click", function() {
    //     if (confirm("Deseja realmente apagar as informações? ") == true) {
    //         ultimaEntrada="";
    //         inputCPF.value="";
    //         Alertar("");
    //         const result = db.exec("DELETE FROM " +  tabela);
    //         renderPresentes();
    //     }
    // });

    buttonEncerrar.addEventListener("click", function() {
        exportDB();
    });

    
    const html5QrCode = new Html5Qrcode("reader");
    function startScan() {
        let options = { fps: 10, qrbox: { width: 400, height: 300} };

        Html5Qrcode.getCameras().then((devices) => {
            if (devices && devices.length) {
                devices.forEach((device) => {
                    //console.log(`Camera ID: ${device.id}, Label: ${device.label}`);
                });
                const cameraId = devices[0].id;

                html5QrCode.start(cameraId,options,onScanSuccess,onScanFailure);
            } else {
                Alertar("Nenhuma câmera encontrada",false);
            }
        }).catch((error) => {
            Alertar("webcam não encontrada ou em uso",false);
        });
    }
    function stopScan() {
        html5QrCode.stop().then((ignore) => {
            // QR Code scanning is stopped.
        }).catch((err) => {
            // Stop failed, handle it.
        });
    }
    function onScanSuccess(decodedText, decodedResult) {
        if(decodedText != ultimaEntrada) {
            ultimaEntrada = decodedText;

            if(decodedText.length = 11) {
                inputCPF.value= decodedText
                formatCPF(inputCPF);
                PesquisarCPF();
            } else {
                console.log("decodedText capturado não reconhecido", decodedText);
            }
            //html5QrcodeScanner.clear();
        }   
    }
    function onScanFailure(error) {
        // Ignora erros de leitura
    }
});