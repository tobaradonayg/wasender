// --- VARIABLES GLOBALES Y UTILIDADES ---
const CONTACTS_KEY = 'waBulkContacts';
const MAX_CONTACTS = 100; // Límite de clientes
let editingIndex = -1; // -1 significa modo "Agregar", >= 0 significa el índice que se está editando

// Mapeo de valores de categoría a etiquetas legibles
const CATEGORY_MAP = {
    cartera: 'Clientes de Cartera',
    top: 'Clientes que Compran Más',
    occasional: 'Clientes que Compran De Vez en Cuando',
    recover: 'Clientes que Necesito Recuperar',
    project: 'Clientes de Proyectos'
};

let contacts = [];
let totalRows = 0; // Variable heredada, no se usa activamente en modo individual.

// --- FUNCIONES DE FORMULARIO Y UI ---

// Muestra/Oculta el campo de info de proyecto según la categoría seleccionada
function toggleProjectInfoInput() {
    const category = document.getElementById('inputCategory').value;
    const projectInfoInput = document.getElementById('inputProjectInfo');
    projectInfoInput.classList.toggle('hidden', category !== 'project');
}

// Cambia el formulario entre modo Agregar y modo Editar
function setFormMode(mode, index = -1) {
    editingIndex = index;
    const title = document.getElementById('formTitle');
    const button = document.getElementById('addEditButton');
    const cancelButton = document.getElementById('cancelEditButton');

    if (mode === 'edit' && index !== -1) {
        title.textContent = `1. Editando Cliente: ${contacts[index].firstName} ${contacts[index].lastName}`;
        button.textContent = 'Guardar Cambios';
        button.classList.remove('bg-green-500');
        button.classList.add('bg-blue-600');
        cancelButton.classList.remove('hidden');
    } else { // Modo 'add' o cancelar edición
        title.textContent = '1. Agregar Nuevo Cliente';
        button.textContent = 'Guardar Cliente';
        button.classList.remove('bg-blue-600');
        button.classList.add('bg-green-500');
        cancelButton.classList.add('hidden');
        // Limpiar inputs
        document.getElementById('inputFirstName').value = '';
        document.getElementById('inputLastName').value = '';
        document.getElementById('inputPhone').value = '';
        document.getElementById('inputCategory').value = 'cartera';
        document.getElementById('inputProjectInfo').value = '';
        toggleProjectInfoInput(); // Oculta el campo de proyecto si no es necesario
    }
}

// Helper para cargar el contacto en el formulario por su índice
function loadContactForEdit(index) {
    const contact = contacts[index];
    document.getElementById('inputFirstName').value = contact.firstName;
    document.getElementById('inputLastName').value = contact.lastName;
    document.getElementById('inputPhone').value = contact.phone;
    document.getElementById('inputCategory').value = contact.category;
    document.getElementById('inputProjectInfo').value = contact.projectInfo || '';

    toggleProjectInfoInput(); // Asegura que el campo de proyecto esté visible si la categoría lo requiere
    setFormMode('edit', index);
}

// Función pública para iniciar la edición buscando por teléfono (más robusto)
function startEditByPhone(phone) {
    const index = contacts.findIndex(c => c.phone === phone);
    if (index > -1) {
        loadContactForEdit(index);
    } else {
        logMessage(`Error: Cliente con teléfono ${phone} no encontrado para editar.`, true);
    }
}

// Cancela el modo de edición
function cancelEdit() {
    setFormMode('add');
}

// --- FUNCIONES DE LOG Y CONFIRMACIÓN ---

function logMessage(message, isError = false) {
    const log = document.getElementById('log');
    const messageElement = document.createElement('span');
    messageElement.textContent = message + '\n';
    messageElement.className = isError ? 'text-red-600 font-bold' : 'text-gray-700';
    log.appendChild(messageElement);
    log.scrollTop = log.scrollHeight;
}

function showCustomConfirmation(message, onConfirm) {
    const log = document.getElementById('log');
    const confirmationDiv = document.createElement('div');
    confirmationDiv.className = 'p-3 bg-red-100 border border-red-400 rounded-lg my-2 text-sm';
    
    const p = document.createElement('p');
    p.textContent = message;
    confirmationDiv.appendChild(p);

    const btnYes = document.createElement('button');
    btnYes.textContent = 'Sí, Confirmar';
    btnYes.className = 'mt-2 mr-2 p-1 px-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition';
    btnYes.onclick = () => {
        log.removeChild(confirmationDiv);
        onConfirm();
    };

    const btnNo = document.createElement('button');
    btnNo.textContent = 'Cancelar';
    btnNo.className = 'mt-2 p-1 px-3 bg-gray-300 rounded-lg hover:bg-gray-400 transition';
    btnNo.onclick = () => {
        log.removeChild(confirmationDiv);
    };

    confirmationDiv.appendChild(btnYes);
    confirmationDiv.appendChild(btnNo);
    log.appendChild(confirmationDiv);
    log.scrollTop = log.scrollHeight;
}

// --- GESTIÓN DE LOCALSTORAGE Y DATOS ---

function loadContacts() {
    try {
        const storedContacts = localStorage.getItem(CONTACTS_KEY);
        contacts = storedContacts ? JSON.parse(storedContacts) : [];
    } catch (error) {
        logMessage('Error al cargar clientes de localStorage.', true);
        contacts = [];
    }
    filterAndSearchContacts(); // Renderiza la lista al cargar
}

function saveContacts() {
    try {
        localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
    } catch (error) {
        logMessage('Error al guardar clientes en localStorage.', true);
    }
    filterAndSearchContacts(); // Renderiza la lista después de guardar
}

// Función unificada para agregar o actualizar
function addOrUpdateContact() {
    const firstNameInput = document.getElementById('inputFirstName');
    const lastNameInput = document.getElementById('inputLastName');
    const phoneInput = document.getElementById('inputPhone');
    const categoryInput = document.getElementById('inputCategory');
    const projectInfoInput = document.getElementById('inputProjectInfo');

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const phone = phoneInput.value.trim();
    const category = categoryInput.value;
    let projectInfo = category === 'project' ? projectInfoInput.value.trim() : '';

    if (!firstName || !phone) {
        logMessage('Error: El Nombre y el Teléfono son obligatorios.', true);
        return;
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    if (editingIndex === -1 && contacts.length >= MAX_CONTACTS) {
        logMessage(`Error: Se ha alcanzado el límite máximo de ${MAX_CONTACTS} clientes.`, true);
        return;
    }

    // Revisa duplicados (excepto si se está editando el mismo contacto)
    const isDuplicate = contacts.some((c, idx) => c.phone === cleanPhone && idx !== editingIndex);
    if (isDuplicate) {
        logMessage(`Advertencia: El número ${cleanPhone} ya existe en la lista.`, true);
        return;
    }

    const newContactData = { 
        firstName: firstName,
        lastName: lastName,
        phone: cleanPhone,
        category: category,
        projectInfo: projectInfo
    };

    if (editingIndex > -1) {
        // Modo Edición
        contacts[editingIndex] = newContactData;
        logMessage(`Cliente Editado: ${firstName} ${lastName} (Categoría: ${CATEGORY_MAP[category]})`);
        setFormMode('add'); // Vuelve al modo agregar
    } else {
        // Modo Agregar
        contacts.push(newContactData);
        logMessage(`Cliente Guardado: ${firstName} ${lastName} (Categoría: ${CATEGORY_MAP[category]})`);
    }

    saveContacts();
    firstNameInput.value = '';
    lastNameInput.value = '';
    phoneInput.value = '';
    projectInfoInput.value = '';
    categoryInput.value = 'cartera';
    toggleProjectInfoInput();
}

/**
 * Función pública para eliminar un contacto buscando por su número de teléfono.
 * Más robusto que usar un índice en un array mutable.
 */
function deleteContactByPhone(phone) {
    // 1. Buscamos el contacto para obtener el nombre antes de la confirmación
    const contact = contacts.find(c => c.phone === phone);

    if (!contact) {
        logMessage(`Error: Cliente con teléfono ${phone} no encontrado para eliminar.`, true);
        return;
    }
    
    const contactName = `${contact.firstName} ${contact.lastName}`;

    // 2. Mostramos la confirmación. El callback utiliza el teléfono (variable inmutable) 
    //    para encontrar y eliminar el contacto correcto.
    showCustomConfirmation(`¿Estás seguro de que quieres eliminar a ${contactName}?`, () => {
        
        // Buscamos el índice justo antes de la eliminación para garantizar la exactitud.
        const finalIndexToDelete = contacts.findIndex(c => c.phone === phone);

        if (finalIndexToDelete > -1) {
            // Eliminación
            contacts.splice(finalIndexToDelete, 1); 
            saveContacts(); // Guardar y re-renderizar
            logMessage(`Cliente eliminado: ${contactName}`);
        } else {
            // Fallback para caso extremo
            logMessage(`Advertencia: El cliente ${contactName} ya había sido eliminado o no se encontró.`, false);
        }
    });
}

function clearContacts() {
    showCustomConfirmation(`¿Estás seguro de que quieres eliminar los ${contacts.length} clientes guardados?`, () => {
        contacts = [];
        saveContacts();
        logMessage('Lista de clientes eliminada completamente.');
    });
}

// --- FUNCIONES DE FILTRADO Y RENDERIZADO DE LISTA ---

function filterAndSearchContacts() {
    const searchTerm = document.getElementById('searchClient').value.toLowerCase().trim();
    const filterValue = document.getElementById('filterCategory').value;
    
    let filteredContacts = contacts;

    // Aplicar filtro de categoría
    if (filterValue !== 'all') {
        filteredContacts = filteredContacts.filter(c => c.category === filterValue);
    }

    // Aplicar búsqueda por nombre/apellido
    if (searchTerm) {
        filteredContacts = filteredContacts.filter(c => 
            c.firstName.toLowerCase().includes(searchTerm) || 
            c.lastName.toLowerCase().includes(searchTerm)
        );
    }

    renderFilteredContacts(filteredContacts);
}

function renderFilteredContacts(filteredContacts) {
    const listContainer = document.getElementById('contactList');
    const countElement = document.getElementById('contactCount');
    listContainer.innerHTML = '';
    
    countElement.textContent = `Mostrando ${filteredContacts.length} / ${MAX_CONTACTS} clientes (Total: ${contacts.length})`;

    if (filteredContacts.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 italic p-4 text-center">No hay clientes que coincidan con los filtros.</p>';
        return;
    }

    filteredContacts.forEach((contact) => {
        // Usamos el teléfono como identificador único para las acciones
        const phoneForAction = contact.phone; 

        const fullName = `${contact.firstName} ${contact.lastName}`;
        const categoryLabel = CATEGORY_MAP[contact.category] || contact.category;
        const projectDisplay = contact.category === 'project' && contact.projectInfo
            ? `<span class="text-xs text-orange-600 italic">(${contact.projectInfo.substring(0, 30)}...)</span>`
            : '';

        const item = document.createElement('div');
        item.className = 'contact-item flex justify-between items-center p-2 border-b border-gray-100 last:border-b-0';
        item.innerHTML = `
            <div class="flex flex-col flex-grow min-w-0 pr-2">
                <div class="font-semibold truncate text-gray-800">${fullName} ${projectDisplay}</div>
                <div class="text-xs text-blue-500 font-medium">${categoryLabel}</div>
                <span class="text-xs text-gray-500">${contact.phone}</span>
            </div>
            <div class="flex space-x-2 flex-shrink-0">
                <!-- Usamos el teléfono para la acción de envío -->
                <button onclick="sendSingleContactByPhone('${phoneForAction}')" 
                        class="text-xs font-semibold px-2 py-1 rounded-lg bg-green-500 text-white hover:bg-wa-dark-green transition">
                    Enviar
                </button>
                <!-- Usamos el teléfono para iniciar la edición -->
                <button onclick="startEditByPhone('${phoneForAction}')" 
                        class="text-xs font-semibold px-2 py-1 rounded-lg bg-yellow-400 text-yellow-900 hover:bg-yellow-500 transition">
                    Editar
                </button>
                <!-- Usamos el teléfono para eliminar -->
                <button onclick="deleteContactByPhone('${phoneForAction}')" 
                        class="text-xs font-semibold px-2 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition">
                    Eliminar
                </button>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

// --- FUNCIONES DE ARRASTRAR Y SOLTAR (DRAG & DROP) ---

function dragStart(event, variable) {
    event.dataTransfer.setData("text/plain", variable);
}

function allowDrop(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();
    const variable = event.dataTransfer.getData("text/plain");
    const textarea = document.getElementById('messageTemplate');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const text = textarea.value;
    const newText = text.substring(0, start) + variable + text.substring(end);

    textarea.value = newText;
    
    textarea.selectionStart = textarea.selectionEnd = start + variable.length;
}

// --- LÓGICA DE ENVÍO INDIVIDUAL ---

// Función para enviar por teléfono (más robusto)
function sendSingleContactByPhone(phone) {
    const index = contacts.findIndex(c => c.phone === phone);
    
    if (index === -1) {
        logMessage(`Error: Cliente con teléfono ${phone} no encontrado para envío.`, true);
        return;
    }

    const contact = contacts[index];
    const messageTemplate = document.getElementById('messageTemplate').value.trim();

    if (!messageTemplate) {
        logMessage('Error: Escribe el mensaje que deseas enviar en la plantilla (sección 2).', true);
        return;
    }

    // Personalización
    let personalizedMessage = messageTemplate;
    personalizedMessage = personalizedMessage.replace(/{{firstName}}/g, contact.firstName);
    personalizedMessage = personalizedMessage.replace(/{{lastName}}/g, contact.lastName);
    personalizedMessage = personalizedMessage.trim();

    const waLink = `https://web.whatsapp.com/send?phone=${contact.phone}&text=${encodeURIComponent(personalizedMessage)}`;
    
    logMessage(`\n--- Envío Individual ---`);
    logMessage(`> Abriendo chat para ${contact.firstName} (${contact.phone})...`);

    // Abre el chat en una nueva pestaña (no requiere delay interno)
    window.open(waLink, '_blank');
    
    logMessage(`> ✅ Chat abierto. Recuerda hacer clic en 'Enviar' manualmente en la nueva pestaña.`);
}

// Inicializar al cargar la página
window.onload = loadContacts;
