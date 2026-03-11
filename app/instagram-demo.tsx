
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import InstagramPost from '@/components/social/InstagramPost';
import { colors } from '@/styles/commonStyles';

export default function InstagramDemoScreen() {
  const [posts, setPosts] = useState([
    {
      id: '1',
      username: 'lavilladelpecado',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
        'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800',
      ],
      caption: 'Noche increíble en La Villa del Pecado 🎉✨ #nightlife #party',
      likes: 1234,
      comments: 89,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      location: 'Madrid, España',
      isLiked: false,
    },
    {
      id: '2',
      username: 'usuario_ejemplo',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      images: [
        'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800',
      ],
      caption: 'Disfrutando del fin de semana 🌟',
      likes: 567,
      comments: 23,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      isLiked: true,
    },
  ]);

  const handleLike = (postId: string) => {
    console.log('Like pressed for post:', postId);
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  const handleComment = (postId: string) => {
    console.log('Comment pressed for post:', postId);
  };

  const handleShare = (postId: string) => {
    console.log('Share pressed for post:', postId);
  };

  const handleUserPress = (username: string) => {
    console.log('User pressed:', username);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Instagram Style Posts',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {posts.map(post => (
          <InstagramPost
            key={post.id}
            username={post.username}
            userAvatar={post.userAvatar}
            images={post.images}
            caption={post.caption}
            likes={post.likes}
            comments={post.comments}
            timestamp={post.timestamp}
            location={post.location}
            isLiked={post.isLiked}
            onLike={() => handleLike(post.id)}
            onComment={() => handleComment(post.id)}
            onShare={() => handleShare(post.id)}
            onUserPress={() => handleUserPress(post.username)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
});
