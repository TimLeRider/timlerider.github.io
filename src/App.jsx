import React, { useState, useEffect } from "react";
import { Menu, X, Gift, Home, Users, LogOut, Trash2, Pencil } from 'lucide-react';
import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [prenom, setPrenom] = useState("");
  const [password, setPassword] = useState("");
  const [currentPage, setCurrentPage] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [users, setUsers] = useState({});
  const [gifts, setGifts] = useState({});
  const [reservations, setReservations] = useState({});
  const [loading, setLoading] = useState(true);
  const [newGiftUrl, setNewGiftUrl] = useState("");
  const [newGiftTitle, setNewGiftTitle] = useState("");
  const [newGiftImage, setNewGiftImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [giftToEdit, setGiftToEdit] = useState(null);

  const startEditGift = (gift) => {
    setGiftToEdit(gift);
    setNewGiftUrl(gift.url);
    setNewGiftTitle(gift.title);
    setImagePreview(gift.image);
    setIsEditing(true);
  };

  useEffect(() => {
    loadData();

    // Écouter les changements en temps réel
    const unsubscribeGifts = onSnapshot(collection(db, "gifts"), (snapshot) => {
      const giftsData = {};
      snapshot.docs.forEach((doc) => {
        giftsData[doc.id] = doc.data().items || [];
      });
      setGifts(giftsData);
    });

    const unsubscribeReservations = onSnapshot(
      collection(db, "reservations"),
      (snapshot) => {
        const reservationsData = {};
        snapshot.docs.forEach((doc) => {
          reservationsData[doc.id] = doc.data().user;
        });
        setReservations(reservationsData);
      }
    );

    return () => {
      unsubscribeGifts();
      unsubscribeReservations();
    };
  }, []);

  const loadData = async () => {
    try {
      // Charger les utilisateurs
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = {};
      usersSnapshot.docs.forEach((doc) => {
        usersData[doc.id] = doc.data().password;
      });
      setUsers(usersData);

      // Charger les cadeaux
      const giftsSnapshot = await getDocs(collection(db, "gifts"));
      const giftsData = {};
      giftsSnapshot.docs.forEach((doc) => {
        giftsData[doc.id] = doc.data().items || [];
      });
      setGifts(giftsData);

      // Charger les réservations
      const reservationsSnapshot = await getDocs(
        collection(db, "reservations")
      );
      const reservationsData = {};
      reservationsSnapshot.docs.forEach((doc) => {
        reservationsData[doc.id] = doc.data().user;
      });
      setReservations(reservationsData);
    } catch (err) {
      console.error("Erreur chargement:", err);
    }
    setLoading(false);
  };

  const hashPassword = async (pwd) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const handleAuth = async () => {
    // 1. Nettoyage de la saisie actuelle (pour la comparaison)
    const inputPrenom = prenom.trim(); // Supprime les espaces au début/fin
    const searchPrenom = inputPrenom.toLowerCase(); // Version minuscule pour chercher

    if (!inputPrenom || !password) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    const hashedPwd = await hashPassword(password);

    // 2. Cherche la VRAIE clé (casse incluse) dans la base de données
    const existingUserKey = Object.keys(users).find(
      (key) => key.trim().toLowerCase() === searchPrenom
    );

    if (isLogin) {
      // --- MODE CONNEXION ---
      if (existingUserKey && users[existingUserKey] === hashedPwd) {
        setCurrentUser(existingUserKey); // Connecte avec la clé d'origine (ex: 'Thomas')
        setPrenom("");
        setPassword("");
      } else {
        alert("Prénom ou mot de passe incorrect");
      }
    } else {
      // --- MODE INSCRIPTION ---
      if (existingUserKey) {
        alert(`Le prénom "${existingUserKey}" est déjà pris.`);
        return;
      }

      try {
        // Enregistre avec le prénom saisi (sans espaces)
        await setDoc(doc(db, "users", inputPrenom), {
          password: hashedPwd,
        });

        setUsers({ ...users, [inputPrenom]: hashedPwd });
        setCurrentUser(inputPrenom);
        setPrenom("");
        setPassword("");
      } catch (err) {
        console.error("Erreur création compte:", err);
        alert("Erreur lors de la création du compte");
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage("home");
    setMenuOpen(false);
  };

  const handleSaveGift = async (url, title, image) => {
    if (!url) {
      alert("Veuillez entrer une URL");
      return;
    }
    let finalTitle = title || "Cadeau";
    let finalImage =
      image || "https://placehold.co/400x400/dc2626/ffffff?text=Cadeau";
    if (!title) {
      try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes("amazon")) {
          finalTitle = "Cadeau Amazon";
        } else {
          finalTitle = `Cadeau de ${urlObj.hostname.replace("www.", "")}`;
        }
      } catch (e) {
        finalTitle = "Cadeau";
      }
    }
    const userGifts = gifts[currentUser] || [];
    let updatedGifts = [...userGifts];

    // Utiliser l'ID si on est en mode édition
    const idToSearch = giftToEdit?.id || url;

    // 1. Chercher le cadeau par ID (si édition) ou par URL (si nouvel ajout)
    const existingGiftIndex = userGifts.findIndex(
      (gift) => gift.id === idToSearch || gift.url === url
    );

    if (existingGiftIndex !== -1) {
      // --- MISE À JOUR D'UN CADEAU EXISTANT ---
      const existingGift = updatedGifts[existingGiftIndex]; // Utiliser la nouvelle image/titre, sinon garder l'ancien
      const newImage =
        image &&
        image !== "https://placehold.co/400x400/dc2626/ffffff?text=Cadeau"
          ? image
          : existingGift.image; // Utiliser le nouveau titre si saisi, sinon l'ancien
      const newTitle = title
        ? finalTitle.substring(0, 150)
        : existingGift.title;

      updatedGifts[existingGiftIndex] = {
        ...existingGift,
        url: url, // Mise à jour de l'URL au cas où seul le titre ou l'image a été saisi
        title: newTitle,
        image: newImage,
      };
      alert(`Cadeau "${newTitle}" mis à jour.`);
    } else {
      // --- AJOUT D'UN NOUVEAU CADEAU ---
      const newGift = {
        id: Date.now(),
        url,
        title: finalTitle.substring(0, 150),
        image: finalImage,
      };
      updatedGifts.push(newGift);
      alert(`Nouveau cadeau "${finalTitle}" ajouté.`);
    }

    try {
      await setDoc(doc(db, "gifts", currentUser), {
        items: updatedGifts,
      }); // Réinitialisation du formulaire et du mode édition
      setNewGiftUrl("");
      setNewGiftTitle("");
      setNewGiftImage("");
      setImagePreview("");
      setIsEditing(false);
      setGiftToEdit(null);
    } catch (err) {
      console.error("Erreur ajout/mise à jour cadeau:", err);
      alert("Erreur lors de l'ajout/mise à jour du cadeau");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setNewGiftImage(base64String);
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteGift = async (giftId) => {
    if (confirm("Voulez-vous vraiment supprimer ce cadeau ?")) {
      const userGifts = gifts[currentUser] || [];
      const updatedGifts = userGifts.filter((gift) => gift.id !== giftId);

      try {
        await setDoc(doc(db, "gifts", currentUser), {
          items: updatedGifts,
        });
      } catch (err) {
        console.error("Erreur suppression:", err);
        alert("Erreur lors de la suppression");
      }
    }
  };

  const reserveGift = async (ownerName, giftId) => {
    const key = `${ownerName}_${giftId}`;

    try {
      if (reservations[key] === currentUser) {
        // Annuler ma réservation
        await deleteDoc(doc(db, "reservations", key));
      } else if (!reservations[key]) {
        // Réserver
        await setDoc(doc(db, "reservations", key), {
          user: currentUser,
        });
      }
    } catch (err) {
      console.error("Erreur réservation:", err);
      alert("Erreur lors de la réservation");
    }
  };

  const getTimeUntilChristmas = () => {
    const now = new Date();
    const christmas = new Date(now.getFullYear(), 11, 25);
    if (now > christmas) christmas.setFullYear(christmas.getFullYear() + 1);

    const diff = christmas - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  };

  const [timeLeft, setTimeLeft] = useState(getTimeUntilChristmas());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilChristmas());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-green-600 flex items-center justify-center">
        <div className="text-white text-2xl">Chargement...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-green-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Gift className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">
              Cadeaux de Noël
            </h1>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prénom
              </label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAuth()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAuth()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleAuth}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              {isLogin ? "Se connecter" : "Créer un compte"}
            </button>
          </div>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full mt-4 text-red-600 font-medium hover:underline"
          >
            {isLogin ? "Créer un compte" : "Déjà un compte ? Se connecter"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-600 text-white p-4 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold">🎄 Cadeaux de Noël</h1>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {menuOpen && (
        <div className="bg-white shadow-lg">
          <nav className="flex flex-col">
            <button
              onClick={() => {
                setCurrentPage("home");
                setMenuOpen(false);
              }}
              className="flex items-center gap-3 px-6 py-4 hover:bg-gray-100 border-b"
            >
              <Home size={20} /> Accueil
            </button>
            <button
              onClick={() => {
                setCurrentPage("my-gifts");
                setMenuOpen(false);
              }}
              className="flex items-center gap-3 px-6 py-4 hover:bg-gray-100 border-b"
            >
              <Gift size={20} /> Mes cadeaux
            </button>
            <button
              onClick={() => {
                setCurrentPage("their-gifts");
                setMenuOpen(false);
              }}
              className="flex items-center gap-3 px-6 py-4 hover:bg-gray-100 border-b"
            >
              <Users size={20} /> Leurs cadeaux
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-6 py-4 hover:bg-gray-100 text-red-600"
            >
              <LogOut size={20} /> Déconnexion
            </button>
          </nav>
        </div>
      )}

      <main className="p-4">
        {currentPage === "home" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-red-500 to-green-500 rounded-2xl shadow-2xl p-8 text-white text-center">
              <h2 className="text-3xl font-bold mb-8">
                Compte à rebours de Noël
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white bg-opacity-20 rounded-xl p-4">
                  <div className="text-5xl font-bold">{timeLeft.days}</div>
                  <div className="text-sm mt-2">Jours</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-4">
                  <div className="text-5xl font-bold">{timeLeft.hours}</div>
                  <div className="text-sm mt-2">Heures</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-4">
                  <div className="text-5xl font-bold">{timeLeft.minutes}</div>
                  <div className="text-sm mt-2">Minutes</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-4">
                  <div className="text-5xl font-bold">{timeLeft.seconds}</div>
                  <div className="text-sm mt-2">Secondes</div>
                </div>
              </div>
              <p className="mt-8 text-xl">Bonjour {currentUser} ! 🎅</p>
            </div>
          </div>
        )}

        {currentPage === "my-gifts" && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              Mes cadeaux
            </h2>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Ajouter un cadeau</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL du cadeau *
                  </label>
                  <input
                    type="url"
                    value={newGiftUrl}
                    onChange={(e) => setNewGiftUrl(e.target.value)}
                    placeholder="https://www.amazon.fr/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titre (optionnel)
                  </label>
                  <input
                    type="text"
                    value={newGiftTitle}
                    onChange={(e) => setNewGiftTitle(e.target.value)}
                    placeholder=""
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photo du cadeau (optionnel)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img
                        src={imagePreview}
                        alt="Aperçu"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-red-500"
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    📸 Sélectionne une photo depuis ta galerie
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleSaveGift(newGiftUrl, newGiftTitle, newGiftImage)}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 mt-4"
              >
                {isEditing ? 'Sauvegarder les modifications' : 'Ajouter le cadeau'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gifts[currentUser]?.map((gift) => (
                <div
                  key={gift.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition relative"
                >
                  <button
                    onClick={() => startEditGift(gift)}
                    className="bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition"
                    title="Modifier ce cadeau"
                  >
                    <Pencil size={16} /> {/* Assurez-vous d'importer Pencil dans les icônes lucide-react */}
                  </button>
                  <button
                    onClick={() => deleteGift(gift.id)}
                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition z-10"
                    title="Supprimer ce cadeau"
                  >
                    <Trash2 size={16} />
                  </button>
                  <a
                    href={gift.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={gift.image}
                      alt={gift.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-800">
                        {gift.title}
                      </h3>
                    </div>
                  </a>
                </div>
              ))}
            </div>

            {(!gifts[currentUser] || gifts[currentUser].length === 0) && (
              <div className="text-center text-gray-500 mt-8">
                Aucun cadeau ajouté pour le moment
              </div>
            )}
          </div>
        )}

        {currentPage === "their-gifts" && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              Leurs cadeaux
            </h2>

            {Object.keys(gifts).filter((name) => name !== currentUser)
              .length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                Aucun autre utilisateur n'a ajouté de cadeaux pour le moment
              </div>
            ) : (
              Object.keys(gifts)
                .filter((name) => name !== currentUser)
                .map((name) => (
                  <div key={name} className="mb-8">
                    <h3 className="text-xl font-bold mb-4 text-red-600">
                      {name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {gifts[name]?.map((gift) => {
                        const reservedBy = reservations[`${name}_${gift.id}`];
                        const isReservedByMe = reservedBy === currentUser;

                        return (
                          <div
                            key={gift.id}
                            className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition flex flex-col"
                          >
                            {/* 1. LIEN - Seulement pour l'image et le titre */}
                            <a
                              href={gift.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block flex-grow group"
                            >
                              <img
                                src={gift.image}
                                alt={gift.title}
                                className="w-full h-48 object-cover group-hover:opacity-90 transition"
                              />

                              <div className="p-4 pb-2">
                                <h4 className="font-semibold text-gray-800 mb-1 group-hover:text-red-600 transition">
                                  {gift.title}
                                </h4>
                                <p className="text-xs text-gray-400">
                                  Voir le lien ↗
                                </p>
                              </div>
                            </a>

                            {/* 2. BOUTON DE RÉSERVATION - SÉPARÉ DU LIEN */}
                            <div className="p-4 pt-2 mt-auto">
                              {reservedBy && (
                                <div className="mb-2 text-sm font-medium text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                                  🎁 Réservé par{" "}
                                  {isReservedByMe ? "moi" : reservedBy}
                                </div>
                              )}

                              <button
                                onClick={() => {
                                  reserveGift(name, gift.id);
                                }}
                                className={`w-full py-2 rounded-lg font-semibold transition ${
                                  isReservedByMe
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : reservedBy
                                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                    : "bg-red-600 text-white hover:bg-red-700"
                                }`}
                                disabled={reservedBy && !isReservedByMe}
                              >
                                {isReservedByMe
                                  ? "✓ Annuler ma réservation"
                                  : reservedBy
                                  ? "Déjà réservé"
                                  : "Réserver ce cadeau"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
