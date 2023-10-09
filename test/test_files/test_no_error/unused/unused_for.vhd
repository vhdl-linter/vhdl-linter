entity unused_for is
end entity;
architecture arch of unused_for is
begin
  process is
  begin
    for I in 1 to 10 loop -- unused iterator constant should not generate an unused warning
      report "hello world";
    end loop;
    wait;
  end process;
  label_x : for I in 1 to 10 generate

  end generate;
end architecture;
