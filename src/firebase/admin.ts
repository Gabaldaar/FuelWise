import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

const serviceAccountConfig = {
  project_id: "studio-1769907004-5fad3",
  client_email: "firebase-adminsdk-fbsvc@studio-1769907004-5fad3.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDTt0Riu0oeJu63\nCkCQU+69AosmxUDLWyiul134pUYe9YMgy5DE+quawTUnpobKPCfLwfQ7+g+NxJT2\nBboC5wgtif/UrqKbCM1b3U5yEaPuUt8GMfhYdMlqrMqqwuBwvhW4tXzIGbHOwxuH\nQ6xF28s1Wg9EW0Er8T2WHnw4QpCciIt0PAJ9TSIwR1nImJETVooO2PjyzM5R6MpM\nxV1LdHpXAPVEdYZdVEm0g2v/5FhoL4PWigL6UY8v7Ys/Rht09QnY1eRKXT2zguyF\nDz0aZas0pV16UdWOsHMRjF4kFsyroxWm85voJCO7DqEq/6TzQGFXweYB4BAUMUji\nzlx7vnT7AgMBAAECggEAKzKtpWeJi/Vtp7NT0R8PC0nFkreUrOmAt37zEZTHZfG6\nO6rNcyOieAUMD3cO8ZyskgqVBtfS7J47tqcceRMivAf4RzEKxI9bN29EXknzJOGL\n1/vCLGpH3pg7EfSJTve5/uIo/7seaI2uxD6um+Jo6A3kJ5JnDcw/QK4fsmsCjq1+\nbzYUsp3fwq+wKCLiVOV6pulQMUGzVfzb3oIttLsULtblIZe3UFazh7QM2lq/wCpl\nW/ClEaTuaRopEpJ7rfNSq44lZJUGiXDAwBaoKvid6AS3p/iZGn5B7urjbBo/+km8\nPn025pJyCtmn5c39ImJnavYHipk185ki/SMEE3GRQQKBgQD47Cn64FIo+e8ZreRY\niso8K7PgrnDA9gVfn9L7FIVu5a5xr/WB50Q9EyqQP0DQdbHBqMdyz8JCjHuwZKuF\npoUdp+GP49wYhV8Pwb4+Ov9Xw0aYw7PXLvtl9bkEv7eRBBqUHSK/bj2scrkwmWNP\nnbNU1OIJGaI3vx9dTrAb7pTJMwKBgQDZvEllttCA+WY1sW19/me1acUBtDQkzDl0\nab+vWXSUQC1MNHSDbSQdggjmgQKZu+06DhhPpNEAjsH9h5oVJa21iTuuojBfVQ4m\nG8Z2EsS6z5ZexmMpRl9GmKHCK4ToZ2ebCNSp3LyQ6U5rJF/bajxguIcjRTFaMWby\n4vR+dLP1GQKBgAab3pF2mzfTSvHXmBRxuuTWFDSG7R9yaLodODDKXrCPEI6cKVyF\nk147wAmMZGAkf8+wd3so4PN7X11TjupBfY9IAckcN5+/CsMUVcS5NEZUPO+ZYpD4\nAly2pW7m2CzVew8rptyGRMTrVtdfey+F9FjwPgAX2iK4xFBp4msbbn/ZAoGAd5qW\nNulVX4OgQZ5VJwC4t06CiY0Tl6MXbHsqcIgTIdyfBV1LI2awkAT+HqB/bTNt/JYB\nhL5kkInaxgnW+gbYhP/9aNBvAe8W9pgLTJDCwFuHnkgb8HBXpc/yC1cciw1CPEd9\nilFWw8Nk8DXq8fxJblfu49D+ayz4ADPrWguBTwECgYEA7k9MqZwfiASUxEu0+Ksv\n/k4wiWk4+0Vn+dIZVGvWR+RmgOPsNr3OUdbpnLXzz12lpgLzHuh2gtDliSMKnxeZ\nxBdav8JRzfgpPjEmTfrlWtnPe611QA5buDwviA+YqKpcSSd5J18CsCwQxg3YpjUU\n8UM4rSMQGRjjMRCV/clF+9A=\n-----END PRIVATE KEY-----\n",
};

let app: App;

if (!getApps().length) {
  const formattedPrivateKey = serviceAccountConfig.private_key.replace(/\\n/g, '\n');
  app = initializeApp({
    credential: cert({
      projectId: serviceAccountConfig.project_id,
      clientEmail: serviceAccountConfig.client_email,
      privateKey: formattedPrivateKey,
    }),
    projectId: serviceAccountConfig.project_id,
  });
  console.log('[Firebase Admin] Initialized cleanly for project:', serviceAccountConfig.project_id);
} else {
  app = getApps()[0];
}

export const adminDb: Firestore = getFirestore(app);
export const adminAuth: Auth = getAuth(app);
export { FieldValue };
export default app;
