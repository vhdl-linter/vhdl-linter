entity dummy is
  port (
    foo : in integer := 1;
    bar : in integer := 0;
    loo : in integer
    );
end entity;

entity instantiation is
end entity;
architecture arch of instantiation is
begin
  dummy3 : entity work.dummy
    port map (
      foo => 2,
      bar => 5,
      loo => 5
      );
  dummy4 : entity work.dummy
    port map (
      foo => open,
      bar => open,
      loo => 2
      );

  dummy : entity work.dummy
    port map (
      foo => 5,
      loo => 5
      );

  dummy2 : entity work.dummy
    port map (
      bar => 5,
      loo => 5
      );

  dummy5 : entity work.dummy
    port map(loo => 5);

  -- Expect only single message (from instantiation)
  dummy6 : entity work.dummy
    port map(
      bar => 5,
      foo => 4);


end architecture;
