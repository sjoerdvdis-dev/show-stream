import { buttonVariants } from '@workspace/ui/components/button';
import { AppLink } from '@workspace/ui/patterns/link';
import { PageContainer } from '@workspace/ui/patterns/page';
import { EmptyState } from '@workspace/ui/patterns/states';

/** A movie's page, or its player, for an id the library does not have. */
export const MovieNotFound = () => (
	<PageContainer>
		<EmptyState
			title="This movie is not in the library"
			description="It may have been removed, or the link may be wrong."
			action={
				<AppLink href="/movies" className={buttonVariants()}>
					Browse movies
				</AppLink>
			}
		/>
	</PageContainer>
);
